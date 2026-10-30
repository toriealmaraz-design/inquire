import { NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { testimonials } from '@/lib/db/schema'
import { getStaffUser, isAdmin } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

// Public: approved testimonials for display. Admins (?all=1): the full moderation queue.
export async function GET(request: Request) {
  const wantAll = new URL(request.url).searchParams.get('all') === '1'
  if (wantAll) {
    const user = await getStaffUser()
    if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
    const rows = await db.select().from(testimonials).orderBy(desc(testimonials.createdAt)).limit(300)
    return NextResponse.json(rows)
  }
  const rows = await db
    .select({ id: testimonials.id, name: testimonials.name, role: testimonials.role, rating: testimonials.rating, body: testimonials.body, createdAt: testimonials.createdAt })
    .from(testimonials)
    .where(eq(testimonials.status, 'approved'))
    .orderBy(desc(testimonials.createdAt))
    .limit(60)
  return NextResponse.json(rows)
}

// Public: submit feedback. Stored as 'pending' until an admin approves it.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const name = clean(body?.name, 120)
  const text = clean(body?.body, 1000)
  const role = clean(body?.role, 120)
  const rating = Math.min(5, Math.max(1, Math.round(Number(body?.rating) || 5)))
  if (!name || text.length < 4) {
    return NextResponse.json({ error: 'Please add your name and a short message.' }, { status: 400 })
  }
  try {
    await db.insert(testimonials).values({ name, role: role || null, rating, body: text, status: 'pending' })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error('Testimonial insert failed:', error)
    return NextResponse.json({ error: 'Could not save your feedback. Please try again.' }, { status: 500 })
  }
}

// Admin: moderate. { id, action: 'approve' | 'hide' | 'delete' }
export async function PATCH(request: Request) {
  const user = await getStaffUser()
  if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const id = Number(body?.id)
  const action = clean(body?.action, 20)
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: 'Valid id required.' }, { status: 400 })
  try {
    if (action === 'delete') {
      await db.delete(testimonials).where(eq(testimonials.id, id))
      return NextResponse.json({ ok: true })
    }
    const status = action === 'approve' ? 'approved' : action === 'hide' ? 'hidden' : ''
    if (!status) return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
    const [updated] = await db.update(testimonials).set({ status }).where(eq(testimonials.id, id)).returning()
    if (!updated) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Testimonial update failed:', error)
    return NextResponse.json({ error: 'Could not update.' }, { status: 500 })
  }
}
