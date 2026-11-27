/**
 * Cloudflare R2 storage with a safe fallback to the existing public Supabase buckets.
 *
 * With all four R2_* variables set, uploads use 900s presigned PUTs and stored files
 * are served through the stable same-origin /api/storage/file?key=... path (which
 * redirects to a short-lived signed GET). Without them, tickets fall back to
 * supabase-js uploads exactly as before, so local/dev deployments keep working.
 *
 * Never put credentials in this file (or anywhere in the client bundle): the AWS
 * SDK is imported lazily, only on the server, and only when R2 is configured.
 */

export type UploadScope = 'uploads' | 'site-assets'
export type UploadTicketInput = { name: string; type: string; size: number; scope: UploadScope }
export type UploadTicket =
  | { mode: 'r2'; url: string; key: string; fileUrl: string; method: 'PUT'; headers: Record<string, string>; expiresIn: 900 }
  | { mode: 'supabase'; bucket: UploadScope; path: string }

export const R2_EXPIRES_IN = 900
export const MAX_FILE_BYTES = 15 * 1024 * 1024
const SCOPES: UploadScope[] = ['uploads', 'site-assets']

// Common brief/branding formats. Keep this in sync with the intake UI guidance.
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  // Browser recordings may arrive with no useful MIME type.
  'application/octet-stream',
  'audio/webm',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'video/webm',
  'video/mp4',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/svg+xml',
])

export class StorageInputError extends Error {}

function env(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || undefined
}

export function isR2Configured(): boolean {
  return !!(env('R2_ACCOUNT_ID') && env('R2_ACCESS_KEY_ID') && env('R2_SECRET_ACCESS_KEY') && env('R2_BUCKET'))
}

/** Server-side validation shared by the ticket helper and the API route. */
export function validateUploadInput(input: unknown): UploadTicketInput {
  if (!input || typeof input !== 'object') throw new StorageInputError('Invalid upload request.')
  const { name, type, size, scope } = input as Record<string, unknown>
  if (!SCOPES.includes(scope as UploadScope)) throw new StorageInputError('Unknown upload scope.')
  if (typeof name !== 'string' || !name.trim() || name.length > 255) throw new StorageInputError('A file name is required.')
  const mime = typeof type === 'string' ? type.split(';')[0].trim().toLowerCase() : ''
  if (!ALLOWED_MIME.has(mime)) throw new StorageInputError('This file type is not allowed.')
  if (typeof size !== 'number' || !Number.isFinite(size) || size < 0 || size > MAX_FILE_BYTES) {
    throw new StorageInputError('Files must be 15 MB or smaller.')
  }
  return { name: name.trim(), type: mime, size, scope: scope as UploadScope }
}

function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() || ''
  const ext = base.match(/\.[a-z0-9]{1,8}$/i)?.[0] || ''
  const stem = base.slice(0, base.length - ext.length).replace(/[^\w.-]+/g, '_').replace(/^\.+/, '').slice(0, 72)
  return `${stem || 'file'}${ext}`
}

/** Accept only keys we generated, so user input can't escape the two prefixes. */
export function isValidStorageKey(key: unknown): key is string {
  if (typeof key !== 'string' || key.length < 4 || key.length > 512) return false
  if (!key.startsWith('uploads/') && !key.startsWith('site-assets/')) return false
  return !/[\\?#:;\0]/.test(key) && !key.includes('..')
}

export function fileUrlForKey(key: string): string {
  return `/api/storage/file?key=${encodeURIComponent(key)}`
}

async function r2Client() {
  const { S3Client } = await import('@aws-sdk/client-s3')
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    forcePathStyle: false,
    credentials: {
      accessKeyId: env('R2_ACCESS_KEY_ID')!,
      secretAccessKey: env('R2_SECRET_ACCESS_KEY')!,
    },
  })
}

/** Stable URL -> R2 key. Everything else (legacy Supabase URLs) returns null. */
export function storageKeyFromUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null
  try {
    const parsed = new URL(url, 'http://localhost')
    if (parsed.pathname !== '/api/storage/file') return null
    const key = parsed.searchParams.get('key')
    return isValidStorageKey(key) ? key : null
  } catch {
    return null
  }
}

export async function createUploadTicket(input: UploadTicketInput): Promise<UploadTicket> {
  const { name, type, scope } = validateUploadInput(input)
  const key = `${scope}/${crypto.randomUUID()}-${safeFileName(name)}`

  if (!isR2Configured()) {
    // Supabase paths are relative to the bucket; the bucket is the key prefix.
    return { mode: 'supabase', bucket: scope, path: key.slice(scope.length + 1) }
  }

  const { PutObjectCommand } = await import('@aws-sdk/client-s3')
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
  const command = new PutObjectCommand({ Bucket: env('R2_BUCKET'), Key: key, ContentType: type })
  const url = await getSignedUrl(await r2Client(), command, {
    expiresIn: R2_EXPIRES_IN,
    // The browser must send exactly this header, and it must stay a header
    // (not be hoisted into the query string) for the signature to match.
    signableHeaders: new Set(['content-type']),
    unhoistableHeaders: new Set(['content-type']),
  })
  return {
    mode: 'r2',
    url,
    key,
    fileUrl: fileUrlForKey(key),
    method: 'PUT',
    headers: { 'Content-Type': type },
    expiresIn: R2_EXPIRES_IN,
  }
}

export async function createDownloadUrl(key: string): Promise<string> {
  if (!isValidStorageKey(key)) throw new StorageInputError('Invalid storage key.')

  if (!isR2Configured()) {
    const base = env('NEXT_PUBLIC_SUPABASE_URL')
    if (!base) throw new Error('Supabase URL is not configured.')
    const bucket = key.split('/')[0]
    const path = key.slice(bucket.length + 1).split('/').map(encodeURIComponent).join('/')
    return `${base.replace(/\/+$/, '')}/storage/v1/object/public/${bucket}/${path}`
  }

  const { GetObjectCommand } = await import('@aws-sdk/client-s3')
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
  return getSignedUrl(await r2Client(), new GetObjectCommand({ Bucket: env('R2_BUCKET'), Key: key }), {
    expiresIn: R2_EXPIRES_IN,
  })
}

export async function deleteStoredObjects(keys: string[]): Promise<void> {
  if (!isR2Configured() || !Array.isArray(keys)) return
  const valid = keys.filter(isValidStorageKey)
  if (!valid.length) return

  const { DeleteObjectsCommand } = await import('@aws-sdk/client-s3')
  const client = await r2Client()
  const Bucket = env('R2_BUCKET')!
  // R2 accepts at most 1000 keys per DeleteObjects call.
  for (let i = 0; i < valid.length; i += 1000) {
    await client.send(new DeleteObjectsCommand({
      Bucket,
      Delete: { Objects: valid.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
    }))
  }
}

/**
 * Bounded, paginated listing for the weekly cleanup. Scans at most 500 objects
 * per prefix so a busy bucket can't turn a cron run into a long polling job.
 */
export async function listExpiredR2Keys(prefix: UploadScope, olderThan: Date, limit = 500): Promise<string[]> {
  if (!isR2Configured()) return []
  const { ListObjectsV2Command } = await import('@aws-sdk/client-s3')
  const client = await r2Client()
  const Bucket = env('R2_BUCKET')!
  const keys: string[] = []
  let scanned = 0
  let token: string | undefined

  do {
    const page = await client.send(new ListObjectsV2Command({
      Bucket,
      Prefix: `${prefix}/`,
      MaxKeys: Math.min(500, limit - scanned),
      ContinuationToken: token,
    }))
    for (const object of page.Contents ?? []) {
      scanned++
      if (object.Key && object.LastModified && object.LastModified < olderThan) keys.push(object.Key)
      if (keys.length >= limit || scanned >= limit) break
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (token && keys.length < limit && scanned < limit)

  return keys
}
