'use client'

import { createClient } from '@/lib/supabase/client'

export type DeleteKind = 'brief' | 'conversation' | 'message' | 'upload' | 'user' | 'announcement'

/**
 * Super admin: permanently delete records (after a confirm prompt), then remove any
 * files that belonged to them from storage. Returns true when deleted.
 */
export async function superDelete(type: DeleteKind, ids: number[], confirmText: string): Promise<boolean> {
  if (!ids.length || !window.confirm(`${confirmText}\n\nThis can't be undone.`)) return false
  const res = await fetch('/api/admin/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, ids }) })
  const d = await res.json().catch(() => ({}))
  if (!res.ok) {
    window.alert(d.error || 'Could not delete.')
    return false
  }
  if (Array.isArray(d.files) && d.files.length) {
    const { error } = await createClient().storage.from('uploads').remove(d.files)
    if (error) console.error('File cleanup failed:', error.message)
  }
  return true
}
