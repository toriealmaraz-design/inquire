import { NextResponse } from 'next/server'
import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { submissions, users } from '@/lib/db/schema'
import { getStaffUser, isAdmin } from '@/lib/auth'
import { agentDisplayLabel, momoFromProfile, roundGhs } from '@/lib/commission'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Admin MoMo batch: only commissions/overrides cleared by client sign-off.
// No client details leave this endpoint — just payee, pseudonymous sub-agent,
// MoMo number and amount.
export async function GET() {
  const user = await getStaffUser()
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  try {
    const rows = await db
      .select({
        id: submissions.id,
        assignedTo: submissions.assignedTo,
        referredBy: submissions.referredBy,
        commissionGhs: submissions.commissionGhs,
        referralCommissionGhs: submissions.referralCommissionGhs,
        uplineAgentId: submissions.uplineAgentId,
        overrideGhs: submissions.overrideGhs,
      })
      .from(submissions)
      .where(and(eq(submissions.commissionStatus, 'AVAILABLE'), isNotNull(submissions.paidAt)))
      .orderBy(desc(submissions.paidAt))
      .limit(500)

    const ids = [...new Set(rows.flatMap((r) => [r.assignedTo, r.referredBy, r.uplineAgentId].filter((v): v is number => !!v)))]
    const agents = ids.length
      ? await db.select({ id: users.id, name: users.name, referralCode: users.referralCode, profile: users.profile }).from(users).where(inArray(users.id, ids))
      : []
    const byId = new Map(agents.map((a) => [a.id, a]))

    const payouts: { agent: string; subAgent: string; momoNumber: string; amountGhs: number }[] = []
    const add = (agentId: number | null, subAgent: string, amount: unknown) => {
      if (!agentId || !(Number(amount) > 0)) return
      const agent = byId.get(agentId)
      payouts.push({
        agent: agent?.name || `Agent #${agentId}`,
        subAgent,
        momoNumber: momoFromProfile(agent?.profile),
        amountGhs: roundGhs(Number(amount)),
      })
    }

    for (const r of rows) {
      add(r.assignedTo, '—', r.commissionGhs)
      if (r.referredBy !== r.assignedTo) add(r.referredBy, '—', r.referralCommissionGhs)
      const sub = r.referredBy ? byId.get(r.referredBy) : null
      add(r.uplineAgentId, sub ? agentDisplayLabel(r.referredBy!, sub.referralCode) : '—', r.overrideGhs)
    }

    return NextResponse.json({ rows: payouts, totalGhs: roundGhs(payouts.reduce((sum, p) => sum + p.amountGhs, 0)) })
  } catch (error) {
    console.error('Payout batch failed:', error)
    return NextResponse.json({ error: 'Could not build the MoMo batch.' }, { status: 500 })
  }
}

const CREDENTIAL_KEYS = new Set(['password', 'pin', 'otp', 'secret', 'token', 'apikey', 'api_key', 'momo', 'momonumber', 'momo_number', 'phone', 'email', 'credentials'])
const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 })

/** Admin-only reference log: records accounting metadata, never credentials. */
export async function PATCH(request: Request) {
  const user = await getStaffUser()
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest('Send a valid JSON body.')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return badRequest('Send a valid JSON body.')
  const input = body as Record<string, unknown>

  // Only accounting metadata is read. Credential fields are rejected outright
  // and every other unknown field is ignored rather than stored.
  const credentialKey = Object.keys(input).find((key) => CREDENTIAL_KEYS.has(key.toLowerCase()))
  if (credentialKey) return badRequest('Credentials are never accepted in the payout reference log.')

  const ticketId = typeof input.ticketId === 'string' ? input.ticketId.trim() : ''
  if (!ticketId || ticketId.length > 20) return badRequest('Provide a valid ticket identifier.')

  const hasReference = Object.prototype.hasOwnProperty.call(input, 'payoutReference')
  const hasSettlement = Object.prototype.hasOwnProperty.call(input, 'settlementDate')
  if (!hasReference && !hasSettlement) return badRequest('Provide a payout reference, a settlement date, or both.')

  let reference: string | null | undefined
  if (hasReference) {
    const raw = input.payoutReference
    if (raw === null || raw === '') reference = null
    else if (typeof raw !== 'string') return badRequest('Payout reference must be text.')
    else {
      const value = raw.trim()
      if (!value || value.length > 120 || /[\r\n]/.test(value)) return badRequest('Payout reference must be between 1 and 120 characters on one line.')
      reference = value
    }
  }

  let settlement: string | null | undefined
  if (hasSettlement) {
    const raw = input.settlementDate
    if (raw === null || raw === '') settlement = null
    else if (typeof raw !== 'string') return badRequest('Settlement date must be text in date format.')
    else {
      const value = raw.trim()
      const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
      const dateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(value)
      if (!dateOnly && !dateTime) return badRequest('Settlement date must be a calendar date or a full date and time.')
      const calendarDate = value.slice(0, 10)
      const validCalendar = new Date(`${calendarDate}T00:00:00.000Z`)
      if (Number.isNaN(validCalendar.getTime()) || validCalendar.toISOString().slice(0, 10) !== calendarDate) {
        return badRequest('Settlement date is not a real calendar date.')
      }
      const parsed = new Date(dateOnly ? `${value}T00:00:00.000Z` : value)
      if (Number.isNaN(parsed.getTime())) return badRequest('Settlement date is not a real calendar date.')
      settlement = parsed.toISOString()
    }
  }

  const changes: Partial<typeof submissions.$inferInsert> = {}
  if (reference !== undefined) changes.payoutReference = reference
  if (settlement !== undefined) changes.settlementDate = settlement ? new Date(settlement) : null

  try {
    const [updated] = await db
      .update(submissions)
      .set(changes)
      .where(eq(submissions.ticketId, ticketId))
      .returning({ id: submissions.id, ticketId: submissions.ticketId })
    if (!updated) return NextResponse.json({ error: 'No ticket matches that identifier.' }, { status: 404 })
    return NextResponse.json({ ok: true, ticketId: updated.ticketId, payoutReference: reference ?? null, settlementDate: settlement ?? null })
  } catch (error) {
    console.error('Payout reference update failed:', error)
    return NextResponse.json({ error: 'Could not record the payout receipt.' }, { status: 500 })
  }
}
