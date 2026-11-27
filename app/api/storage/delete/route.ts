import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStaffUser } from '@/lib/auth'
import { deleteStoredObjects, isR2Configured, isValidStorageKey } from '@/lib/storage/r2'

export const runtime = 'nodejs'

// Staff cleanup endpoint: removes R2 objects (when configured) or the matching
// Supabase objects when running in fallback mode. Keys are full storage keys.
export async function POST(request: Request) {
  const me = await getStaffUser()
  if (!me) return NextResponse.json({ error: 'Staff access required.' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const keys = (Array.isArray(body?.keys) ? body.keys : [])
    .filter((key: unknown): key is string => isValidStorageKey(key))
    .slice(0, 500)
  if (!keys.length) return NextResponse.json({ error: 'Provide storage keys to delete.' }, { status: 400 })

  try {
    if (isR2Configured()) {
      await deleteStoredObjects(keys)
      return NextResponse.json({ deleted: keys.length, mode: 'r2' })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const groups = new Map<string, string[]>()
    for (const key of keys) {
      const [prefix, ...rest] = key.split('/')
      const bucket = prefix === 'site-assets' ? prefix : 'uploads'
      groups.set(bucket, [...(groups.get(bucket) || []), rest.join('/') || key])
    }
    let deleted = 0
    for (const [bucket, paths] of groups) {
      const { data, error } = await supabase.storage.from(bucket).remove(paths)
      if (error) throw error
      deleted += data?.length || 0
    }
    return NextResponse.json({ deleted, mode: 'supabase' })
  } catch (error) {
    console.error('Storage delete failed:', error)
    return NextResponse.json({ error: 'Could not delete files.' }, { status: 500 })
  }
}
