import { NextResponse } from 'next/server'
import { and, desc, eq, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/lib/db'
import { settings, submissions, users } from '@/lib/db/schema'
import { ADMIN_ROLES, CHAT_ROLES, getStaffUser, isAdmin, isLead } from '@/lib/auth'
import { briefTitle, fieldLabel } from '@/lib/fields'
import { OVERRIDE_RATE, netMargin, roundGhs, subAgentOverride } from '@/lib/commission'
import { missingQaChecks, parseQaChecklist } from '@/components/admin/qa-checklist-keys'
import { sendPush } from '@/lib/push'

export const runtime = 'nodejs'

const HOUR = 3_600_000
const DAY = 24 * HOUR

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

const referrer = alias(users, 'referrer')
const assignee = alias(users, 'assignee')

const isDelivered = (status: string | null) => /delivered|complete|paid/i.test(status || '')

// A job cannot move into a delivered/completed/paid state before the four
// quality-assurance checks are ticked and signed off.
function deliveryErrors(checklist: unknown, signedOffAt: unknown) {
  const missing = missingQaChecks(checklist)
  if (!signedOffAt) missing.push('Quality assurance sign-off')
  return missing
}

function deliveryErrorMessage(missing: string[]) {
  return `Complete the quality-assurance checklist before delivery: ${missing.join(', ')}.`
}

// Plain-language stale flag. No server polling: this is computed once per GET
// from createdAt / assignedAt / status / paidAt. assignedAt is the only stored
// specialist-update timestamp, so it acts as the last specialist update.
function staleNote(row: {
  createdAt: Date | null
  assignedAt: Date | null
  status: string | null
  paidAt: Date | null
}): string | null {
  if (row.paidAt || isDelivered(row.status)) return null
  const created = row.createdAt ? new Date(row.createdAt).getTime() : NaN
  if (!Number.isFinite(created)) return null
  const now = Date.now()
  const waitingForQuote = !row.assignedAt && /pending quote|quot|await/i.test(row.status || '')
  if (waitingForQuote && now - created > 2 * DAY) return 'Waiting over 2 days for quote approval'
  if (row.assignedAt) {
    const assigned = new Date(row.assignedAt).getTime()
    if (Number.isFinite(assigned) && now - assigned > DAY) return 'Waiting over 1 day since the last specialist update'
  }
  return null
}

// Quote guardrail: after the specialist fee, direct agent cuts and the
// sub-agent override are paid, at least 15 percent of the quote must remain.
function marginCheck(quote: number, specialistFee: number, directAgentCut: number) {
  const net = netMargin(quote, specialistFee, directAgentCut)
  const override = subAgentOverride(net)
  const platformMargin = roundGhs(net - override)
  const required = roundGhs(quote * OVERRIDE_RATE)
  const figures = `quote GHS ${quote.toFixed(2)}, specialist fee GHS ${specialistFee.toFixed(2)}, direct agent cut GHS ${directAgentCut.toFixed(2)}, sub-agent override GHS ${override.toFixed(2)}`
  return {
    net,
    override,
    platformMargin,
    required,
    ok: platformMargin > 0 && platformMargin >= required,
    error: `Quote guardrail: ${figures} leaves GHS ${platformMargin.toFixed(2)} of platform margin, below the required GHS ${required.toFixed(2)} (${Math.round(OVERRIDE_RATE * 100)} percent of the quote).`,
  }
}

// Returns null when the field was not supplied, a non-negative amount when it
// was, and NaN when it is invalid.
function suppliedAmount(value: unknown) {
  if (value === undefined) return null
  if (value === null || value === '') return 0
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? n : NaN
}

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
// BEFORE the override, so the override can only ever come from platform margin.
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
        assignedAt: submissions.assignedAt,
        handoffNote: submissions.handoffNote,
        handoffAt: submissions.handoffAt,
        qaChecklist: submissions.qaChecklist,
        qaSignedOffAt: submissions.qaSignedOffAt,
        specialistFeeGhs: submissions.specialistFeeGhs,
        quoteNetMarginGhs: submissions.quoteNetMarginGhs,
        payoutReference: submissions.payoutReference,
        settlementDate: submissions.settlementDate,
        createdAt: submissions.createdAt,
      })
      .from(submissions)
      .leftJoin(referrer, eq(submissions.referredBy, referrer.id))
      .leftJoin(assignee, eq(submissions.assignedTo, assignee.id))
      .orderBy(desc(submissions.createdAt))
      .limit(100)
    return NextResponse.json(rows.map((row) => ({ ...row, staleFlag: staleNote(row) })))
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

    // Track-based ticket number from the database, for example AC-2610-007 (matches TICKET_RE / tracker)
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
//  { action: 'qualityAssurance', id, qaChecklist, signOff, handoffNote } -> save checklist progress only
//  { action: 'deliver', id }                        -> mark Delivered after the quality-assurance gate passes
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
      const nextStatus = text('status', 30)
      if (nextStatus && !isDelivered(existing.status) && isDelivered(nextStatus)) {
        const missing = deliveryErrors(existing.qaChecklist, existing.qaSignedOffAt)
        if (missing.length) return NextResponse.json({ error: deliveryErrorMessage(missing) }, { status: 400 })
      }
      if (text('title', 120) !== undefined) set.title = text('title', 120) || null
      if (text('briefDetails', 4000) !== undefined) set.briefDetails = text('briefDetails', 4000)
      if (text('clientContact', 50) !== undefined) set.clientContact = text('clientContact', 50)
      if (text('scope', 50) !== undefined) set.scope = text('scope', 50)
      if (text('urgency', 50) !== undefined) set.urgency = text('urgency', 50)
      if (nextStatus) set.status = nextStatus
      if (text('handoffNote', 2000) !== undefined) set.handoffNote = text('handoffNote', 2000) || null
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
      const specialistFee = suppliedAmount(f.specialistFeeGhs)
      if (f.specialistFeeGhs !== undefined) {
        if (Number.isNaN(specialistFee!)) return NextResponse.json({ error: 'Invalid specialist fee.' }, { status: 400 })
        set.specialistFeeGhs = (specialistFee || 0).toFixed(2)
      }
      const quoteMargin = suppliedAmount(f.quoteNetMarginGhs)
      if (f.quoteNetMarginGhs !== undefined) {
        if (Number.isNaN(quoteMargin!)) return NextResponse.json({ error: 'Invalid quote net margin.' }, { status: 400 })
        set.quoteNetMarginGhs = (quoteMargin || 0).toFixed(2)
      }
      // Guardrail runs for a new quote or a newly supplied specialist fee.
      const guardQuote = Number(set.priceGhs ?? existing.priceGhs ?? 0)
      if (guardQuote > 0 && (f.priceGhs !== undefined || f.specialistFeeGhs !== undefined)) {
        const fee = f.specialistFeeGhs !== undefined ? specialistFee! : Number(existing.specialistFeeGhs || 0)
        const direct = Number((set.commissionGhs ?? existing.commissionGhs) || 0)
          + Number((set.referralCommissionGhs ?? existing.referralCommissionGhs) || 0)
        const check = marginCheck(guardQuote, fee, direct)
        if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })
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

    // Save checklist progress (and an optional handoff note) without touching status.
    if (body?.action === 'qualityAssurance') {
      if (body.qaChecklist !== undefined && (typeof body.qaChecklist !== 'object' || body.qaChecklist === null || Array.isArray(body.qaChecklist))) {
        return NextResponse.json({ error: 'Invalid quality-assurance checklist.' }, { status: 400 })
      }
      const checklist = parseQaChecklist(body.qaChecklist ?? existing.qaChecklist)
      const missing = missingQaChecks(checklist)
      const set: Partial<typeof submissions.$inferInsert> = { qaChecklist: checklist }
      if (body.handoffNote !== undefined) {
        set.handoffNote = clean(body.handoffNote, 2000) || null
        if (set.handoffNote && !existing.handoffAt) set.handoffAt = new Date()
      }
      if (body.signOff === true) {
        if (missing.length) {
          return NextResponse.json({ error: `Cannot sign off quality assurance yet: ${missing.join(', ')} still outstanding.` }, { status: 400 })
        }
        set.qaSignedOffAt = existing.qaSignedOffAt ?? new Date()
      } else if (missing.length) {
        // Editing a completed checklist back to incomplete revokes the sign-off.
        set.qaSignedOffAt = null
      }
      const [updated] = await db.update(submissions).set(set).where(eq(submissions.id, id)).returning()
      return NextResponse.json(updated)
    }

    // Explicit delivery action used by the admin dashboard.
    if (body?.action === 'deliver') {
      if (isDelivered(existing.status) || existing.paidAt) return NextResponse.json(existing)
      if (!existing.assignedTo) return NextResponse.json({ error: 'Assign the job before marking it delivered.' }, { status: 400 })
      const missing = deliveryErrors(existing.qaChecklist, existing.qaSignedOffAt)
      if (missing.length) return NextResponse.json({ error: deliveryErrorMessage(missing) }, { status: 400 })
      const [updated] = await db.update(submissions).set({ status: 'Delivered' }).where(eq(submissions.id, id)).returning()
      return NextResponse.json(updated)
    }

    // Client-visible revision counter: maximum of two, guarded in SQL against races.
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
      // Referral commission only when a DIFFERENT agent referred the client via their link.
      // An agent assigned to their own referral never double-dips.
      const referral = existing.referredBy && existing.referredBy !== agent.id ? commission : 0
      const specialistFee = suppliedAmount(body?.specialistFeeGhs)
      const quoteMargin = suppliedAmount(body?.quoteNetMarginGhs)
      if (Number.isNaN(specialistFee!)) return NextResponse.json({ error: 'Invalid specialist fee.' }, { status: 400 })
      if (Number.isNaN(quoteMargin!)) return NextResponse.json({ error: 'Invalid quote net margin.' }, { status: 400 })
      const check = marginCheck(price, specialistFee || 0, commission + referral)
      if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

      const [updated] = await db
        .update(submissions)
        .set({
          assignedTo: agent.id,
          assignedAt: new Date(),
          status: 'Assigned',
          priceGhs: price.toFixed(2),
          commissionGhs: commission.toFixed(2),
          referralCommissionGhs: referral ? referral.toFixed(2) : null,
          specialistFeeGhs: body?.specialistFeeGhs === undefined ? undefined : (specialistFee || 0).toFixed(2),
          quoteNetMarginGhs: body?.quoteNetMarginGhs === undefined ? undefined : (quoteMargin || 0).toFixed(2),
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
      // Paid is a delivered state for the client, so the quality-assurance gate applies when
      // a job skips the explicit Delivered action.
      if (!isDelivered(existing.status)) {
        const missing = deliveryErrors(existing.qaChecklist, existing.qaSignedOffAt)
        if (missing.length) return NextResponse.json({ error: deliveryErrorMessage(missing) }, { status: 400 })
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
