import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { eq, like, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings, submissions, uploads } from '@/lib/db/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Weekly, Sundays 03:00 UTC (vercel.json cron): delete uploaded files older than the retention period
// to stay inside the Supabase free tier. Storage only allows deleting EXPIRED files,
// so calling this early does nothing harmful.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [config] = await db.select({ days: settings.fileRetentionDays }).from(settings).where(eq(settings.id, 1)).limit(1)
  const days = config?.days ?? 7

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
