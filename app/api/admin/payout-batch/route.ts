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
