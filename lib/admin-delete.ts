'use client'

import { createClient } from '@/lib/supabase/client'

export type DeleteKind = 'brief' | 'conversation' | 'message' | 'upload' | 'user' | 'announcement' | 'complaint'

// Same-origin stable links store the R2 key in the query string. Legacy Supabase
// public URLs return null and keep using the existing storage cleanup below.
function keyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url, window.location.origin)
    if (parsed.pathname !== '/api/storage/file') return null
    const key = parsed.searchParams.get('key')
    if (!key || !/^(uploads|site-assets)\/[\w.-]+(?:\/[\w.-]+)*$/.test(key) || key.includes('..')) return null
    return key
  } catch {
    return null
  }
}

// Collect keys BEFORE the DB rows are deleted. RLS is off for these tables, and
// the caller is the super admin, so the anon-key client can read the URLs.
async function r2KeysFor(type: DeleteKind, ids: number[]): Promise<string[]> {
  if (type !== 'brief' && type !== 'conversation' && type !== 'upload') return []
  const supabase = createClient()
  let urls: (string | null)[] = []
  if (type === 'brief') {
    const { data } = await supabase.from('submissions').select('file_urls').in('id', ids)
    urls = (data || []).map((row: { file_urls: string | null }) => row.file_urls)
  } else {
    const column = type === 'conversation' ? 'conversation_id' : 'id'
    const { data } = await supabase.from('uploads').select('file_url').in(column, ids)
    urls = (data || []).map((row: { file_url: string | null }) => row.file_url)
  }
  const keys = urls.flatMap((value) => (value || '').split(',').map(keyFromUrl).filter((k): k is string => !!k))
  return Array.from(new Set(keys)).slice(0, 500)
}

/**
 * Super admin: permanently delete records (after a confirm prompt), then remove any
 * files that belonged to them from storage. Returns true when deleted.
 */
export async function superDelete(type: DeleteKind, ids: number[], confirmText: string): Promise<boolean> {
  if (!ids.length || !window.confirm(`${confirmText}\n\nThis can't be undone.`)) return false

  let r2Keys: string[] = []
  try {
    r2Keys = await r2KeysFor(type, ids)
  } catch (error) {
    console.error('R2 key lookup failed:', error)
  }

  const res = await fetch('/api/admin/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, ids }) })
  const d = await res.json().catch(() => ({}))
  if (!res.ok) {
    window.alert(d.error || 'Could not delete.')
    return false
  }

  // Private R2 objects can't be removed by the browser; the staff-only route does it.
  if (r2Keys.length) {
    const cleanup = await fetch('/api/storage/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys: r2Keys }),
    }).catch(() => null)
    if (cleanup && !cleanup.ok) console.error('R2 file cleanup failed:', cleanup.status)
  }

  if (Array.isArray(d.files) && d.files.length) {
    const { error } = await createClient().storage.from('uploads').remove(d.files)
    if (error) console.error('File cleanup failed:', error.message)
  }
  return true
}
