import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { flaggedContacts } from '@/lib/db/schema'
import { getStaffUser, isAdmin } from '@/lib/auth'
import { contactKey } from '@/lib/phone'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const clean = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

async function guard() {
  const user = await getStaffUser()
  return user && isAdmin(user.role) ? user : null
}

// Admin-only list. Before the setup SQL is re-run the table may not exist —
// return an empty list with a warning instead of taking down the dashboard.
export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  try {
    const rows = await db.select().from(flaggedContacts).orderBy(desc(flaggedContacts.createdAt)).limit(200)
    return NextResponse.json({ flags: rows })
  } catch (error) {
    console.error('Flagged contacts unavailable:', error)
    return NextResponse.json({ flags: [], warning: 'Run supabase_setup.sql to create flagged_contacts.' })
  }
}

export async function POST(request: Request) {
  const user = await guard()
  if (!user) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const phone = clean(body?.phone, 80)
  const key = contactKey(phone)
  if (!phone || !key) return NextResponse.json({ error: 'Enter a valid phone number or handle.' }, { status: 400 })

  const reason = clean(body?.reason, 120) || 'High risk'
  const note = clean(body?.note, 500) || null
  try {
    const inserted = await db
      .insert(flaggedContacts)
      .values({ phone, phoneKey: key, reason, note, createdBy: user.id })
      .onConflictDoNothing()
      .returning()
    if (inserted.length) return NextResponse.json({ flag: inserted[0] }, { status: 201 })
    const [existing] = await db.select().from(flaggedContacts).where(eq(flaggedContacts.phoneKey, key)).limit(1)
    return NextResponse.json({ flag: existing })
  } catch (error) {
    console.error('Flag save failed:', error)
    return NextResponse.json({ error: 'Could not save the flag. Run supabase_setup.sql first.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  if (!(await guard())) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const id = Number(body?.id)
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: 'Valid id required.' }, { status: 400 })
  try {
    await db.delete(flaggedContacts).where(eq(flaggedContacts.id, id))
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Flag delete failed:', error)
    return NextResponse.json({ error: 'Could not remove the flag.' }, { status: 500 })
  }
}
