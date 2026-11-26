import { NextResponse } from 'next/server'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { CHAT_ROLES, getStaffUser } from '@/lib/auth'

export const runtime = 'nodejs'

// POST /api/agent/upline?upline=CODE — bind a new agent to their inviter.
// Depth cap 2: the inviter must not already have a parent, and neither may the
// agent being bound (no re-parenting, no loops).
export async function POST(request: Request) {
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 403 })

  const fromQuery = new URL(request.url).searchParams.get('upline')
  const body = await request.json().catch(() => null)
  const code = String(fromQuery ?? body?.upline ?? '').trim().toUpperCase().slice(0, 20)
  if (!code) return NextResponse.json({ error: 'Enter a valid invite code.' }, { status: 400 })

  try {
    const [[current], [upline], children] = await Promise.all([
      db.select({ id: users.id, parentAgentId: users.parentAgentId }).from(users).where(eq(users.id, user.id)).limit(1),
      db.select({ id: users.id, parentAgentId: users.parentAgentId, referralCode: users.referralCode })
        .from(users)
        .where(and(eq(users.referralCode, code), eq(users.status, 'active'), inArray(users.role, CHAT_ROLES)))
        .limit(1),
      db.select({ id: users.id }).from(users).where(eq(users.parentAgentId, user.id)).limit(1),
    ])
    if (!current) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
    if (!upline) return NextResponse.json({ error: 'That invite code is not active.' }, { status: 400 })
    if (upline.id === current.id) return NextResponse.json({ error: 'You cannot invite yourself.' }, { status: 400 })
    if (upline.parentAgentId) return NextResponse.json({ error: 'That agent is already in a sub-agent network.' }, { status: 400 })
    if (current.parentAgentId && current.parentAgentId !== upline.id) {
      return NextResponse.json({ error: 'You are already linked to an upline.' }, { status: 409 })
    }
    if (current.parentAgentId === upline.id) return NextResponse.json({ ok: true, upline: code })
    if (children.length) return NextResponse.json({ error: 'Agents with sub-agents cannot join an upline.' }, { status: 400 })

    const [linked] = await db
      .update(users)
      .set({ parentAgentId: upline.id, updatedAt: new Date() })
      .where(and(eq(users.id, current.id), isNull(users.parentAgentId)))
      .returning({ parentAgentId: users.parentAgentId })
    if (!linked) return NextResponse.json({ error: 'You are already linked to an upline.' }, { status: 409 })

    return NextResponse.json({ ok: true, upline: code })
  } catch (error) {
    console.error('Upline binding failed:', error)
    return NextResponse.json({ error: 'Could not link this invite code.' }, { status: 500 })
  }
}
