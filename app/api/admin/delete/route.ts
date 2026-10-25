import { NextResponse } from 'next/server'
import { inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { announcements, conversations, messages, pushSubscriptions, submissions, uploads, users } from '@/lib/db/schema'
import { getStaffUser } from '@/lib/auth'

export const runtime = 'nodejs'

type Kind = 'brief' | 'conversation' | 'message' | 'upload' | 'user' | 'announcement'
const KINDS: Kind[] = ['brief', 'conversation', 'message', 'upload', 'user', 'announcement']

/**
 * Super admin only: permanently delete records.
 * Body: { type, ids: number[] }. Returns the storage paths of any files that belonged
 * to the deleted records so the browser (signed in as super admin) can remove them.
 */
export async function POST(request: Request) {
  const me = await getStaffUser()
  if (!me || me.role !== 'super_admin') return NextResponse.json({ error: 'Only the super admin can delete.' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const type = body?.type as Kind
  const ids: number[] = Array.isArray(body?.ids) ? body.ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0).slice(0, 500) : []
  if (!KINDS.includes(type) || !ids.length) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const pathOf = (url: string | null) => (url && url.includes('/uploads/') ? decodeURIComponent(url.split('/uploads/')[1].split('?')[0]) : null)
  const files: string[] = []

  try {
    await db.transaction(async (tx) => {
      if (type === 'brief') {
        const rows = await tx.select({ f: submissions.fileUrls }).from(submissions).where(inArray(submissions.id, ids))
        rows.forEach((r) => pathOf(r.f) && files.push(pathOf(r.f)!))
        await tx.delete(submissions).where(inArray(submissions.id, ids))
      }
      if (type === 'conversation') {
        const ups = await tx.select({ u: uploads.fileUrl }).from(uploads).where(inArray(uploads.conversationId, ids))
        ups.forEach((r) => pathOf(r.u) && files.push(pathOf(r.u)!))
        await tx.delete(uploads).where(inArray(uploads.conversationId, ids))
        await tx.delete(messages).where(inArray(messages.conversationId, ids))
        await tx.delete(conversations).where(inArray(conversations.id, ids))
      }
      if (type === 'message') await tx.delete(messages).where(inArray(messages.id, ids))
      if (type === 'upload') {
        const ups = await tx.select({ u: uploads.fileUrl }).from(uploads).where(inArray(uploads.id, ids))
        ups.forEach((r) => pathOf(r.u) && files.push(pathOf(r.u)!))
        await tx.delete(uploads).where(inArray(uploads.id, ids))
      }
      if (type === 'announcement') await tx.delete(announcements).where(inArray(announcements.id, ids))
      if (type === 'user') {
        if (ids.includes(me.id)) throw new Error('self')
        // Keep briefs/history but unlink the person, then remove them
        await tx.update(submissions).set({ assignedTo: null }).where(inArray(submissions.assignedTo, ids))
        await tx.update(submissions).set({ referredBy: null }).where(inArray(submissions.referredBy, ids))
        await tx.update(announcements).set({ createdBy: null }).where(inArray(announcements.createdBy, ids))
        await tx.delete(pushSubscriptions).where(inArray(pushSubscriptions.userId, ids))
        await tx.delete(users).where(inArray(users.id, ids))
      }
    })
  } catch (error) {
    if ((error as Error).message === 'self') return NextResponse.json({ error: "You can't delete your own super admin account." }, { status: 400 })
    console.error('Delete failed:', error)
    return NextResponse.json({ error: 'Could not delete.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, deleted: ids.length, files })
}
