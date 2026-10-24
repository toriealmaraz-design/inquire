import { NextResponse } from 'next/server'
import { and, desc, eq, inArray, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/lib/db'
import { settings, submissions, users } from '@/lib/db/schema'
import { ADMIN_ROLES, getStaffUser, isAdmin } from '@/lib/auth'
import { fieldLabel } from '@/lib/fields'
import { sendPush } from '@/lib/push'

export const runtime = 'nodejs'

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

const referrer = alias(users, 'referrer')

// Admins: all intake briefs, with who referred them
export async function GET() {
  const user = await getStaffUser()
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }
  try {
    const rows = await db
      .select({
        id: submissions.id,
        ticketId: submissions.ticketId,
        category: submissions.category,
        serviceType: submissions.serviceType,
        scope: submissions.scope,
        urgency: submissions.urgency,
        clientContact: submissions.clientContact,
        briefDetails: submissions.briefDetails,
        fileUrls: submissions.fileUrls,
        status: submissions.status,
        referredBy: submissions.referredBy,
        referrerName: referrer.name,
        priceGhs: submissions.priceGhs,
        commissionGhs: submissions.commissionGhs,
        paidAt: submissions.paidAt,
        createdAt: submissions.createdAt,
      })
      .from(submissions)
      .leftJoin(referrer, eq(submissions.referredBy, referrer.id))
      .orderBy(desc(submissions.createdAt))
      .limit(100)
    return NextResponse.json(rows)
  } catch (error) {
    console.error('Submissions fetch failed:', error)
    return NextResponse.json({ error: 'Could not load submissions.' }, { status: 500 })
  }
}

// Public: a client submits a brief from the homepage
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const category = clean(body.category, 50)
  const serviceType = clean(body.serviceType, 100)
  if (!category || !serviceType) {
    return NextResponse.json({ error: 'Category and service type are required.' }, { status: 400 })
  }

  try {
    // Attribute to an agent if the client arrived through a referral link
    let referredBy: number | null = null
    const ref = clean(body.ref, 20).toUpperCase()
    if (ref) {
      const [agent] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.referralCode, ref), eq(users.status, 'active')))
        .limit(1)
      referredBy = agent?.id ?? null
    }

    let created: { id: number; ticketId: string } | undefined
    for (let attempt = 0; attempt < 3 && !created; attempt++) {
      const [latest] = await db.select({ ticketId: submissions.ticketId }).from(submissions).orderBy(desc(submissions.id)).limit(1)
      const latestNumber = latest?.ticketId ? Number(latest.ticketId.replace(/\D/g, '')) : 1041
      const ticketId = `GN-${(Number.isFinite(latestNumber) ? latestNumber : 1041) + 1 + attempt}`
      try {
        ;[created] = await db
          .insert(submissions)
          .values({
            ticketId,
            category,
            serviceType,
            scope: clean(body.scope, 50),
            urgency: clean(body.urgency, 50),
            clientContact: clean(body.clientContact, 50),
            briefDetails: clean(body.briefDetails, 1600),
            fileUrls: clean(body.fileUrls, 1000),
            referredBy,
          })
          .returning({ id: submissions.id, ticketId: submissions.ticketId })
      } catch (error) {
        if (attempt === 2) throw error // ticket number collision 3 times: give up
      }
    }
    if (!created) throw new Error('Insert failed')

    // Tell the super admin + admins of this field, and the referring agent
    try {
      const admins = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.status, 'active'), inArray(users.role, ADMIN_ROLES), or(eq(users.role, 'super_admin'), eq(users.field, category))))
      await Promise.all([
        sendPush(
          { userIds: admins.map((a) => a.id) },
          { title: `New brief ${created.ticketId}`, body: `${fieldLabel(category)} · ${clean(body.scope, 50)} · ${clean(body.urgency, 50)}`, url: '/dashboard', tag: `brief-${created.id}` }
        ),
        referredBy
          ? sendPush({ userIds: [referredBy] }, { title: 'A client used your link', body: `Brief ${created.ticketId} was submitted. You earn commission when it's paid.`, url: '/agent/dashboard' })
          : Promise.resolve(0),
      ])
    } catch (error) {
      console.error('Brief notification failed:', error)
    }

    return NextResponse.json({ ticketId: created.ticketId }, { status: 201 })
  } catch (error) {
    console.error('Submission insert failed:', error)
    return NextResponse.json({ error: 'We could not save your brief. Please try again or use Live Chat.' }, { status: 500 })
  }
}

// Admins: mark a brief as paid. Commission = price × the % in Settings.
export async function PATCH(request: Request) {
  const user = await getStaffUser()
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const id = Number(body?.id)
  const price = Number(body?.priceGhs)
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: 'Valid brief ID required.' }, { status: 400 })
  if (!Number.isFinite(price) || price <= 0 || price > 1_000_000) {
    return NextResponse.json({ error: 'Enter the job price in GHS.' }, { status: 400 })
  }

  try {
    const [existing] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1)
    if (!existing) return NextResponse.json({ error: 'Brief not found.' }, { status: 404 })
    if (existing.paidAt) return NextResponse.json({ error: 'This brief is already marked paid.' }, { status: 409 })

    const [config] = await db.select({ pct: settings.commissionPercent }).from(settings).where(eq(settings.id, 1)).limit(1)
    const pct = Number(config?.pct ?? 10)
    const commission = existing.referredBy ? Math.round(price * pct) / 100 : null

    const [updated] = await db
      .update(submissions)
      .set({ status: 'Paid', priceGhs: price.toFixed(2), commissionGhs: commission === null ? null : commission.toFixed(2), paidAt: new Date() })
      .where(eq(submissions.id, id))
      .returning()

    if (existing.referredBy && commission !== null) {
      try {
        await sendPush(
          { userIds: [existing.referredBy] },
          { title: `You earned GHS ${commission.toFixed(2)}`, body: `Commission for ${existing.ticketId} (${pct}% of GHS ${price.toFixed(2)}).`, url: '/agent/dashboard' }
        )
      } catch (error) {
        console.error('Commission push failed:', error)
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Mark paid failed:', error)
    return NextResponse.json({ error: 'Could not update the brief.' }, { status: 500 })
  }
}
