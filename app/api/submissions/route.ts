import { NextResponse } from 'next/server'
import { and, desc, eq, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/lib/db'
import { settings, submissions, users } from '@/lib/db/schema'
import { ADMIN_ROLES, CHAT_ROLES, getStaffUser, isAdmin, isLead } from '@/lib/auth'
import { briefTitle, fieldLabel } from '@/lib/fields'
import { netMargin, subAgentOverride } from '@/lib/commission'
import { sendPush } from '@/lib/push'

export const runtime = 'nodejs'

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

const referrer = alias(users, 'referrer')
const assignee = alias(users, 'assignee')

const isDelivered = (status: string | null) => /delivered|complete|paid/i.test(status || '')

// A valid chain is exactly two levels: referrer -> upline, with no parent above
// the upline. Never infer an override from an unlinked or over-deep account.
async function resolveUpline(referredBy: number | null) {
  if (!referredBy) return null
  const [referring] = await db
    .select({ parentAgentId: users.parentAgentId })
    .from(users)
    .where(eq(users.id, referredBy))
    .limit(1)
  if (!referring?.parentAgentId) return null
  const [parent] = await db
    .select({ id: users.id, parentAgentId: users.parentAgentId })
    .from(users)
    .where(eq(users.id, referring.parentAgentId))
    .limit(1)
  return parent && !parent.parentAgentId ? parent.id : null
}

// The specialist's pay and the referring agent's commission are subtracted
// BEFORE the 15% override, so the override can only ever come from platform margin.
async function overrideFor(row: {
  referredBy: number | null
  assignedTo: number | null
  priceGhs: string | null
  commissionGhs: string | null
  referralCommissionGhs: string | null
}) {
  const uplineAgentId = await resolveUpline(row.referredBy)
  if (!uplineAgentId) return null
  const direct = row.referredBy && row.referredBy !== row.assignedTo ? Number(row.referralCommissionGhs || 0) : 0
  const override = subAgentOverride(netMargin(row.priceGhs, row.commissionGhs, direct))
  return { uplineAgentId, overrideGhs: override.toFixed(2) }
}

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
        title: submissions.title,
        scope: submissions.scope,
        urgency: submissions.urgency,
        clientContact: submissions.clientContact,
        briefDetails: submissions.briefDetails,
        fileUrls: submissions.fileUrls,
        status: submissions.status,
        referredBy: submissions.referredBy,
        referrerName: referrer.name,
        assignedTo: submissions.assignedTo,
        assigneeName: assignee.name,
        priceGhs: submissions.priceGhs,
        commissionGhs: submissions.commissionGhs,
        referralCommissionGhs: submissions.referralCommissionGhs,
        paidAt: submissions.paidAt,
        revisionCount: submissions.revisionCount,
        clientSignoffAt: submissions.clientSignoffAt,
        commissionStatus: submissions.commissionStatus,
        overrideGhs: submissions.overrideGhs,
        createdAt: submissions.createdAt,
      })
      .from(submissions)
      .leftJoin(referrer, eq(submissions.referredBy, referrer.id))
      .leftJoin(assignee, eq(submissions.assignedTo, assignee.id))
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
    let uplineAgentId: number | null = null
    const ref = clean(body.ref, 20).toUpperCase()
    if (ref) {
      const [agent] = await db
        .select({ id: users.id, parentAgentId: users.parentAgentId })
        .from(users)
        .where(and(eq(users.referralCode, ref), eq(users.status, 'active')))
        .limit(1)
      referredBy = agent?.id ?? null
      if (agent?.parentAgentId) {
        const [parent] = await db
          .select({ id: users.id, parentAgentId: users.parentAgentId })
          .from(users)
          .where(eq(users.id, agent.parentAgentId))
          .limit(1)
        if (parent && !parent.parentAgentId) uplineAgentId = parent.id
      }
    }

    // Track-based ticket number from the database, e.g. AC-2610-007 (matches TICKET_RE / tracker)
    const { rows: [num] } = await db.execute(sql`select public.next_ticket_id(${category}) as id`)
    const ticketId = String((num as { id: string }).id)
    const [created] = await db
      .insert(submissions)
      .values({
        ticketId,
        category,
        serviceType,
        title: briefTitle({ title: clean(body.title, 120), briefDetails: clean(body.briefDetails, 1600), serviceType }),
        scope: clean(body.scope, 50),
        urgency: clean(body.urgency, 50),
        clientContact: clean(body.clientContact, 50),
        briefDetails: clean(body.briefDetails, 1600),
        fileUrls: clean(body.fileUrls, 1000),
        referredBy,
        uplineAgentId,
      })
      .returning({ id: submissions.id, ticketId: submissions.ticketId })
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
          { title: `New brief: ${briefTitle({ title: clean(body.title, 120), briefDetails: clean(body.briefDetails, 1600), serviceType })}`, body: `${created.ticketId} · ${fieldLabel(category)} · ${clean(body.scope, 50)} · ${clean(body.urgency, 50)}`, url: '/dashboard', tag: `brief-${created.id}` }
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

// Admins:
//  { action: 'assign', id, assignedTo, priceGhs }  -> give the job to an agent with its price (required)
//  { action: 'paid', id }                           -> client paid; commissions become earned
// Commission = price x the % in Settings, for the assigned agent and (separately) the referrer.
export async function PATCH(request: Request) {
  const user = await getStaffUser()
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const id = Number(body?.id)
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: 'Valid brief ID required.' }, { status: 400 })

  try {
    const [existing] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1)
    if (!existing) return NextResponse.json({ error: 'Brief not found.' }, { status: 404 })
    if (body?.action === 'rename') {
      const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 120) : ''
      if (!title) return NextResponse.json({ error: 'Enter a title.' }, { status: 400 })
      const [updated] = await db.update(submissions).set({ title }).where(eq(submissions.id, id)).returning()
      return NextResponse.json(updated)
    }

    // Super admin: change anything on a brief, even after it is paid
    if (body?.action === 'edit') {
      if (user.role !== 'super_admin') return NextResponse.json({ error: 'Only the super admin can edit briefs.' }, { status: 403 })
      const f = body.fields || {}
      const set: Partial<typeof submissions.$inferInsert> = {}
      const text = (k: string, n: number) => (typeof f[k] === 'string' ? f[k].trim().slice(0, n) : undefined)
      if (text('title', 120) !== undefined) set.title = text('title', 120) || null
      if (text('briefDetails', 4000) !== undefined) set.briefDetails = text('briefDetails', 4000)
      if (text('clientContact', 50) !== undefined) set.clientContact = text('clientContact', 50)
      if (text('scope', 50) !== undefined) set.scope = text('scope', 50)
      if (text('urgency', 50) !== undefined) set.urgency = text('urgency', 50)
      if (text('status', 30)) set.status = text('status', 30)
      if (f.priceGhs !== undefined) {
        const price = Number(f.priceGhs)
        if (f.priceGhs === '' || f.priceGhs === null) set.priceGhs = null
        else if (Number.isFinite(price) && price >= 0 && price <= 1_000_000) {
          set.priceGhs = price.toFixed(2)
          const [cfg] = await db.select({ pct: settings.commissionPercent }).from(settings).where(eq(settings.id, 1)).limit(1)
          const c = Math.round(price * Number(cfg?.pct ?? 10)) / 100
          if (existing.assignedTo) set.commissionGhs = c.toFixed(2)
          // No referral commission when the referrer is also the assignee (no double-dip).
          if (existing.referredBy && existing.referredBy !== existing.assignedTo) set.referralCommissionGhs = c.toFixed(2)
          else if (existing.referredBy) set.referralCommissionGhs = null
        } else return NextResponse.json({ error: 'Invalid price.' }, { status: 400 })
      }
      if (f.unpay === true) {
        set.paidAt = null
        set.commissionStatus = 'PENDING'
        set.clientSignoffAt = null
        set.overrideGhs = null
      }
      // A delivered/paid brief can also be priced after it moves through tracking.
      // Recompute only before clearance, so an AVAILABLE ledger row stays stable.
      if (f.unpay !== true && existing.commissionStatus !== 'AVAILABLE' && isDelivered(text('status', 30) || existing.status)) {
        const asString = (v: unknown, fallback: string | null) => (typeof v === 'string' ? v : fallback)
        const override = await overrideFor({
          referredBy: existing.referredBy,
          assignedTo: existing.assignedTo,
          priceGhs: asString(set.priceGhs, existing.priceGhs),
          commissionGhs: asString(set.commissionGhs, existing.commissionGhs),
          referralCommissionGhs: asString(set.referralCommissionGhs, existing.referralCommissionGhs),
        })
        if (override) Object.assign(set, override)
      }
      if (!Object.keys(set).length) return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 })
      const [updated] = await db.update(submissions).set(set).where(eq(submissions.id, id)).returning()
      return NextResponse.json(updated)
    }

    // Client-visible revision counter: max 2, guarded in SQL against races.
    if (body?.action === 'revision') {
      if (existing.clientSignoffAt) return NextResponse.json({ error: 'The client has already signed off.' }, { status: 409 })
      if (existing.revisionCount >= 2) return NextResponse.json({ error: 'The two-revision limit has been reached.' }, { status: 409 })
      const [updated] = await db
        .update(submissions)
        .set({ revisionCount: sql`least(2, ${submissions.revisionCount} + 1)` })
        .where(and(eq(submissions.id, id), sql`${submissions.revisionCount} < 2`, isNull(submissions.clientSignoffAt)))
        .returning()
      if (!updated) return NextResponse.json({ error: 'The two-revision limit has been reached.' }, { status: 409 })
      return NextResponse.json(updated)
    }

    // Explicit client acceptance is what releases PENDING commissions/overrides.
    if (body?.action === 'clientSignoff') {
      if (!existing.paidAt) return NextResponse.json({ error: 'Mark the job paid before sign-off.' }, { status: 400 })
      if (!isDelivered(existing.status)) return NextResponse.json({ error: 'Deliver the job before sign-off.' }, { status: 400 })
      if (existing.commissionStatus === 'AVAILABLE') return NextResponse.json(existing)
      const set: Partial<typeof submissions.$inferInsert> = {
        commissionStatus: 'AVAILABLE',
        clientSignoffAt: new Date(),
      }
      if (existing.uplineAgentId && !existing.overrideGhs) {
        const override = await overrideFor(existing)
        if (override) Object.assign(set, override)
      }
      const [updated] = await db
        .update(submissions)
        .set(set)
        .where(and(eq(submissions.id, id), eq(submissions.commissionStatus, 'PENDING'), isNotNull(submissions.paidAt)))
        .returning()
      if (!updated) return NextResponse.json({ error: 'Commission is not pending clearance.' }, { status: 409 })
      return NextResponse.json(updated)
    }

    if (existing.paidAt) return NextResponse.json({ error: 'This job is already paid and locked.' }, { status: 409 })

    if (body?.action === 'assign') {
      const price = Number(body?.priceGhs)
      const agentId = Number(body?.assignedTo)
      if (!Number.isFinite(price) || price <= 0 || price > 1_000_000) {
        return NextResponse.json({ error: 'Enter the job price in GHS before assigning.' }, { status: 400 })
      }
      const [agent] = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(and(eq(users.id, agentId), eq(users.status, 'active'), inArray(users.role, CHAT_ROLES)))
        .limit(1)
      if (!agent) return NextResponse.json({ error: 'Pick an active agent.' }, { status: 400 })

      const [config] = await db.select({ pct: settings.commissionPercent }).from(settings).where(eq(settings.id, 1)).limit(1)
      const pct = Number(config?.pct ?? 10)
      const commission = Math.round(price * pct) / 100

      const [updated] = await db
        .update(submissions)
        .set({
          assignedTo: agent.id,
          assignedAt: new Date(),
          status: 'Assigned',
          priceGhs: price.toFixed(2),
          commissionGhs: commission.toFixed(2),
          // Referral commission only when a DIFFERENT agent referred the client via their link.
          // An agent assigned to their own referral never double-dips.
          referralCommissionGhs: existing.referredBy && existing.referredBy !== agent.id ? commission.toFixed(2) : null,
        })
        .where(eq(submissions.id, id))
        .returning()

      sendPush(
        { userIds: [agent.id] },
        { title: `New assignment: ${briefTitle(existing)}`, body: `${existing.ticketId} · price GHS ${price.toFixed(2)} · your commission GHS ${commission.toFixed(2)}`, url: '/agent/dashboard' }
      ).catch((e) => console.error('Assign push failed:', e))

      return NextResponse.json({ ...updated, assigneeName: agent.name })
    }

    if (body?.action === 'paid') {
      if (!isLead(user.role)) {
        return NextResponse.json({ error: 'Only leads and the super admin can mark jobs paid.' }, { status: 403 })
      }
      if (!existing.assignedTo || !existing.priceGhs) {
        return NextResponse.json({ error: 'Assign the job to an agent with a price first.' }, { status: 400 })
      }
      // Marking paid only clears the ledger for release; client sign-off makes
      // commission + any margin-funded override AVAILABLE for the MoMo batch.
      const override = await overrideFor(existing)
      const [updated] = await db
        .update(submissions)
        .set({
          status: 'Paid',
          paidAt: new Date(),
          commissionStatus: 'PENDING',
          uplineAgentId: override?.uplineAgentId ?? null,
          overrideGhs: override?.overrideGhs ?? null,
        })
        .where(eq(submissions.id, id))
        .returning()

      const notify = [...new Set([existing.assignedTo, existing.referredBy].filter((v): v is number => !!v))]
      sendPush(
        { userIds: notify },
        { title: `Commission earned on ${existing.ticketId}`, body: `GHS ${Number(existing.commissionGhs).toFixed(2)} is now in your earnings.`, url: '/agent/dashboard' }
      ).catch((e) => console.error('Paid push failed:', e))

      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (error) {
    console.error('Submission update failed:', error)
    return NextResponse.json({ error: 'Could not update the brief.' }, { status: 500 })
  }
}
