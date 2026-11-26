import { NextResponse } from 'next/server'
import { and, desc, eq, isNotNull, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/lib/db'
import { submissions, users } from '@/lib/db/schema'
import { getStaffUser } from '@/lib/auth'
import { agentDisplayLabel } from '@/lib/commission'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const referrer = alias(users, 'payout_referrer')

// Read-only payout log: direct referral commissions PLUS margin-funded overrides
// earned as an upline. There is no MoMo reference column, so the job ticket ID
// is the payout reference.
export async function GET() {
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 403 })

  try {
    const rows = await db
      .select({
        id: submissions.id,
        ticketId: submissions.ticketId,
        status: submissions.status,
        commissionStatus: submissions.commissionStatus,
        amountGhs: submissions.referralCommissionGhs,
        overrideGhs: submissions.overrideGhs,
        referredBy: submissions.referredBy,
        uplineAgentId: submissions.uplineAgentId,
        subCode: referrer.referralCode,
        paidAt: submissions.paidAt,
      })
      .from(submissions)
      .leftJoin(referrer, eq(submissions.referredBy, referrer.id))
      .where(and(
        isNotNull(submissions.paidAt),
        or(eq(submissions.referredBy, user.id), and(eq(submissions.uplineAgentId, user.id), isNotNull(submissions.overrideGhs)))
      ))
      .orderBy(desc(submissions.paidAt))
      .limit(200)

    const round = (n: number) => Math.round(n * 100) / 100
    const payouts = rows.flatMap((r) => {
      const list: {
        id: number
        ticketId: string
        date: string | null
        amountGhs: number
        status: string
        kind: 'referral' | 'override'
        subAgent: string | null
      }[] = []
      const date = r.paidAt ? r.paidAt.toISOString() : null
      if (r.referredBy === user.id && Number(r.amountGhs || 0) > 0) {
        list.push({ id: r.id, ticketId: r.ticketId, date, amountGhs: round(Number(r.amountGhs)), status: r.status || 'Paid', kind: 'referral', subAgent: null })
      }
      if (r.uplineAgentId === user.id && Number(r.overrideGhs || 0) > 0) {
        list.push({
          id: r.id,
          ticketId: r.ticketId,
          date,
          amountGhs: round(Number(r.overrideGhs)),
          status: r.commissionStatus === 'AVAILABLE' ? 'Available' : 'Pending clearance',
          kind: 'override',
          subAgent: r.referredBy ? agentDisplayLabel(r.referredBy, r.subCode) : null,
        })
      }
      return list
    })

    const overrides = payouts.filter((p) => p.kind === 'override')
    return NextResponse.json({
      referralCode: user.referralCode,
      payouts,
      totalPaidGhs: round(payouts.reduce((sum, p) => sum + p.amountGhs, 0)),
      overridePaidGhs: round(overrides.reduce((sum, p) => sum + p.amountGhs, 0)),
      overrideCount: overrides.length,
    })
  } catch (error) {
    console.error('Payouts error:', error)
    return NextResponse.json({ error: 'Could not load payout history.' }, { status: 500 })
  }
}
