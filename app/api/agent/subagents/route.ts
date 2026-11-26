import { NextResponse } from 'next/server'
import { eq, inArray, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { submissions, users } from '@/lib/db/schema'
import { getStaffUser } from '@/lib/auth'
import { agentDisplayLabel, roundGhs } from '@/lib/commission'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Anonymized roster for the signed-in upline. Deliberately selects no phone,
// email, referral code or client data — only pseudonyms and aggregate counts.
export async function GET() {
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 403 })

  try {
    const children = await db
      .select({ id: users.id, referralCode: users.referralCode, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.parentAgentId, user.id))
      .limit(200)

    if (!children.length) {
      return NextResponse.json({
        subAgentCount: 0,
        activeThisWeek: 0,
        totalOverrideGhs: 0,
        availableOverrideGhs: 0,
        agents: [],
      })
    }

    const ids = children.map((c) => c.id)
    const activity = await db
      .select({
        referredBy: submissions.referredBy,
        assignedTo: submissions.assignedTo,
        createdAt: submissions.createdAt,
        paidAt: submissions.paidAt,
        overrideGhs: submissions.overrideGhs,
        uplineAgentId: submissions.uplineAgentId,
        commissionStatus: submissions.commissionStatus,
      })
      .from(submissions)
      .where(or(inArray(submissions.referredBy, ids), inArray(submissions.assignedTo, ids)))
      .limit(1000)

    const cutoff = Date.now() - 7 * 86_400_000
    const withinWeek = (value: Date | null) => !!value && value.getTime() >= cutoff
    const stats = children.map((child) => {
      let referrals = 0
      let jobs = 0
      let overrideGhs = 0
      let availableOverrideGhs = 0
      let activeThisWeek = false
      for (const row of activity) {
        const mine = row.referredBy === child.id || row.assignedTo === child.id
        if (!mine) continue
        if (withinWeek(row.createdAt) || withinWeek(row.paidAt)) activeThisWeek = true
        if (row.referredBy === child.id) referrals++
        if (row.assignedTo === child.id) jobs++
        if (row.uplineAgentId === user.id && row.paidAt) {
          const amount = Number(row.overrideGhs || 0)
          if (amount > 0) {
            overrideGhs += amount
            if (row.commissionStatus === 'AVAILABLE') availableOverrideGhs += amount
          }
        }
      }
      return {
        label: agentDisplayLabel(child.id, child.referralCode),
        referrals,
        jobs,
        activeThisWeek,
        overrideGhs: roundGhs(overrideGhs),
        availableOverrideGhs: roundGhs(availableOverrideGhs),
      }
    })

    return NextResponse.json({
      subAgentCount: stats.length,
      activeThisWeek: stats.filter((s) => s.activeThisWeek).length,
      totalOverrideGhs: roundGhs(stats.reduce((sum, s) => sum + s.overrideGhs, 0)),
      availableOverrideGhs: roundGhs(stats.reduce((sum, s) => sum + s.availableOverrideGhs, 0)),
      agents: stats,
    })
  } catch (error) {
    console.error('Sub-agent roster failed:', error)
    return NextResponse.json({ error: 'Could not load your sub-agent roster.' }, { status: 500 })
  }
}
