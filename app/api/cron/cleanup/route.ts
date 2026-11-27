import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { eq, inArray, like, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings, submissions, uploads } from '@/lib/db/schema'
import { deleteStoredObjects, isR2Configured, listExpiredR2Keys, storageKeyFromUrl } from '@/lib/storage/r2'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Weekly, Sundays 03:00 UTC (vercel.json cron): delete uploaded files older than the retention period
// to stay inside the free tier. Supabase Storage only allows deleting EXPIRED files,
// so calling this early does nothing harmful there; R2 objects are listed via the
// bounded S3 API and removed directly when credentials are configured.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [config] = await db.select({ days: settings.fileRetentionDays }).from(settings).where(eq(settings.id, 1)).limit(1)
  const days = config?.days ?? 7

  if (isR2Configured()) {
    try {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      // Only brief/chat attachments expire. site-assets holds the logo/favicon and must persist.
      const keys = await listExpiredR2Keys('uploads', cutoff)
      if (!keys.length) return NextResponse.json({ deleted: 0, retentionDays: days, mode: 'r2' })
      await deleteStoredObjects(keys)
      const gone = new Set(keys)

      const uploadRows = await db.select({ id: uploads.id, fileUrl: uploads.fileUrl })
        .from(uploads).where(like(uploads.fileUrl, '%/api/storage/file%')).limit(500)
      const uploadIds = uploadRows
        .filter((row) => { const key = storageKeyFromUrl(row.fileUrl); return !!key && gone.has(key) })
        .map((row) => row.id)
      if (uploadIds.length) await db.delete(uploads).where(inArray(uploads.id, uploadIds))

      const briefRows = await db.select({ id: submissions.id, fileUrls: submissions.fileUrls })
        .from(submissions).where(like(submissions.fileUrls, '%/api/storage/file%')).limit(500)
      for (const row of briefRows) {
        const urls = (row.fileUrls || '').split(',').map((url) => url.trim()).filter(Boolean)
        const kept = urls.filter((url) => {
          const key = storageKeyFromUrl(url)
          return !key || !gone.has(key)
        })
        if (kept.length !== urls.length) {
          await db.update(submissions).set({ fileUrls: kept.length ? kept.join(',') : 'expired' }).where(eq(submissions.id, row.id))
        }
      }
      return NextResponse.json({ deleted: keys.length, retentionDays: days, mode: 'r2' })
    } catch (error) {
      console.error('R2 cleanup failed:', error)
      return NextResponse.json({ error: 'R2 cleanup failed.' }, { status: 500 })
    }
  }

  const expired = await db.execute(
    sql`select name from storage.objects where bucket_id = 'uploads' and created_at < now() - make_interval(days => ${days}) limit 500`
  )
  const names = (expired.rows as { name: string }[]).map((r) => r.name)
  if (!names.length) return NextResponse.json({ deleted: 0, retentionDays: days })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data, error } = await supabase.storage.from('uploads').remove(names)
  if (error) {
    console.error('Cleanup failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const removed = (data ?? []).map((o) => o.name)

  if (removed.length) {
    const urlEnds = removed.map((n) => like(uploads.fileUrl, `%/uploads/${n}`))
    await db.delete(uploads).where(or(...urlEnds))
    const briefEnds = removed.map((n) => like(submissions.fileUrls, `%/uploads/${n}`))
    await db.update(submissions).set({ fileUrls: 'expired' }).where(or(...briefEnds))
  }

  return NextResponse.json({ deleted: removed.length, retentionDays: days })
}
