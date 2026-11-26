import { NextResponse } from 'next/server'
import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { submissions } from '@/lib/db/schema'
import { getStaffUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Read-only payout log: paid referral commissions for the signed-in agent.
// There is no MoMo reference column, so the job ticket ID is the payout reference.
export async function GET() {
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 403 })

  try {
    const rows = await db
      .select({
        id: submissions.id,
        ticketId: submissions.ticketId,
        status: submissions.status,
        amountGhs: submissions.referralCommissionGhs,
        paidAt: submissions.paidAt,
      })
      .from(submissions)
      .where(and(eq(submissions.referredBy, user.id), isNotNull(submissions.paidAt)))
      .orderBy(desc(submissions.paidAt))
      .limit(200)

    const payouts = rows.map((r) => ({
      id: r.id,
      ticketId: r.ticketId,
      date: r.paidAt ? r.paidAt.toISOString() : null,
      amountGhs: Math.round(Number(r.amountGhs || 0) * 100) / 100,
      status: r.status || 'Paid',
    }))
    const round = (n: number) => Math.round(n * 100) / 100

    return NextResponse.json({
      referralCode: user.referralCode,
      payouts,
      totalPaidGhs: round(payouts.reduce((sum, p) => sum + p.amountGhs, 0)),
    })
  } catch (error) {
    console.error('Payouts error:', error)
    return NextResponse.json({ error: 'Could not load payout history.' }, { status: 500 })
  }
}
