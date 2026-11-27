import type { SupabaseClient } from '@supabase/supabase-js'

export type StorageScope = 'uploads' | 'site-assets'

type UploadResponse =
  | { mode: 'r2'; url: string; key: string; fileUrl: string; method: 'PUT'; headers: Record<string, string>; expiresIn: number }
  | { mode: 'supabase'; bucket: string; path: string }

const DEFAULT_FILENAME = 'voice-message.webm'
const MIME_FALLBACK = 'application/octet-stream'

function uploadName(file: File | Blob, filename?: string) {
  return filename || ('name' in file ? file.name : '') || DEFAULT_FILENAME
}

// The original direct-to-Supabase path, used when the storage API is unavailable.
async function uploadToSupabase(
  supabase: SupabaseClient,
  file: File | Blob,
  scope: StorageScope,
  name: string,
  contentType: string,
) {
  const path = `${scope}/${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, '_') || DEFAULT_FILENAME}`
  const { error } = await supabase.storage.from(scope).upload(path, file, {
    contentType,
    cacheControl: '3600',
    upsert: scope === 'site-assets',
  })
  if (error) throw new Error(error.message || 'The file could not be uploaded.')
  return supabase.storage.from(scope).getPublicUrl(path).data.publicUrl
}

/**
 * Uploads a browser file through the storage API (R2 presigned PUT or Supabase Storage),
 * falling back to a direct Supabase upload if that route fails.
 */
export async function uploadStorageFile(
  supabase: SupabaseClient,
  file: File | Blob,
  scope: StorageScope = 'uploads',
  filename?: string,
): Promise<string> {
  const name = uploadName(file, filename)
  const type = file.type || MIME_FALLBACK

  try {
    const response = await fetch('/api/storage/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, size: file.size, scope }),
    })
    if (!response.ok) throw new Error(`Storage upload request failed (${response.status}).`)
    const result = (await response.json()) as UploadResponse

    if (result?.mode === 'r2') {
      const put = await fetch(result.url, { method: result.method, headers: result.headers, body: file })
      if (!put.ok) throw new Error(`Storage upload failed (${put.status}).`)
      return result.fileUrl
    }

    if (result?.mode === 'supabase') {
      const { error } = await supabase.storage.from(result.bucket).upload(result.path, file, {
        upsert: scope === 'site-assets',
      })
      if (error) throw new Error(error.message || 'The file could not be uploaded.')
      return supabase.storage.from(result.bucket).getPublicUrl(result.path).data.publicUrl
    }

    throw new Error('The storage service returned an unexpected response.')
  } catch {
    try {
      return await uploadToSupabase(supabase, file, scope, name, type)
    } catch (fallbackError) {
      throw new Error(
        fallbackError instanceof Error ? fallbackError.message : 'The file could not be uploaded. Please try again.',
      )
    }
  }
}
