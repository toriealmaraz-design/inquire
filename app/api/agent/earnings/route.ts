import { NextResponse } from 'next/server'
import { desc, eq, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings, submissions } from '@/lib/db/schema'
import { ensureReferralCode, getStaffUser } from '@/lib/auth'
import { briefTitle } from '@/lib/fields'
import { commissionStage, isPaidReferral, roundGhs } from '@/lib/commission'

export const runtime = 'nodejs'

// The signed-in staff member's assignments, referrals and commission.
// Deliberately excludes client contact details and uploaded files.
export async function GET() {
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 403 })

  try {
    const [referralCode, rows, [config]] = await Promise.all([
      ensureReferralCode(user),
      db
        .select({
          id: submissions.id,
          ticketId: submissions.ticketId,
          category: submissions.category,
          serviceType: submissions.serviceType,
          title: submissions.title,
          scope: submissions.scope,
          urgency: submissions.urgency,
          briefDetails: submissions.briefDetails,
          status: submissions.status,
          priceGhs: submissions.priceGhs,
          commissionGhs: submissions.commissionGhs,
          referralCommissionGhs: submissions.referralCommissionGhs,
          overrideGhs: submissions.overrideGhs,
          commissionStatus: submissions.commissionStatus,
          clientSignoffAt: submissions.clientSignoffAt,
          assignedTo: submissions.assignedTo,
          referredBy: submissions.referredBy,
          uplineAgentId: submissions.uplineAgentId,
          assignedAt: submissions.assignedAt,
          paidAt: submissions.paidAt,
          createdAt: submissions.createdAt,
        })
        .from(submissions)
        .where(or(eq(submissions.assignedTo, user.id), eq(submissions.referredBy, user.id)))
        .orderBy(desc(submissions.createdAt))
        .limit(200),
      db.select({ pct: settings.commissionPercent }).from(settings).where(eq(settings.id, 1)).limit(1),
    ])

    const iso = (value: Date | null) => value ? value.toISOString() : null
    const stageInput = (r: (typeof rows)[number]) => ({
      status: r.status,
      commissionStatus: r.commissionStatus,
      paidAt: r.paidAt,
      clientSignoffAt: r.clientSignoffAt,
    })

    const items = rows.map((r) => {
      const mine =
        (r.assignedTo === user.id ? Number(r.commissionGhs || 0) : 0) +
        (r.referredBy === user.id ? Number(r.referralCommissionGhs || 0) : 0)
      const assignedToMe = r.assignedTo === user.id
      const referredByMe = r.referredBy === user.id
      return {
        id: r.id,
        ticketId: r.ticketId,
        category: r.category,
        serviceType: r.serviceType,
        title: briefTitle(r),
        // Brief details only for work actually assigned to this person
        scope: assignedToMe ? r.scope : null,
        urgency: assignedToMe ? r.urgency : null,
        briefDetails: assignedToMe ? r.briefDetails : null,
        status: r.status,
        commissionStatus: r.commissionStatus,
        stage: commissionStage(stageInput(r)),
        clientSignoffAt: iso(r.clientSignoffAt),
        priceGhs: assignedToMe ? r.priceGhs : null,
        myCommission: roundGhs(mine),
        directCommissionGhs: roundGhs(referredByMe ? Number(r.referralCommissionGhs || 0) : assignedToMe ? Number(r.commissionGhs || 0) : 0),
        // Override exists only when this agent is the upline on the ticket.
        overrideGhs: r.uplineAgentId === user.id ? roundGhs(Number(r.overrideGhs || 0)) : 0,
        assignedToMe,
        referredByMe,
        paidAt: iso(r.paidAt),
        createdAt: iso(r.createdAt),
      }
    })

    const earned = roundGhs(items.filter((i) => i.paidAt).reduce((s, i) => s + i.myCommission, 0))
    const pending = roundGhs(items.filter((i) => !i.paidAt).reduce((s, i) => s + i.myCommission, 0))
    // Rank and the verified network counter use completed AND paid referrals only.
    const paidReferrals = rows.filter((r) => r.referredBy === user.id && isPaidReferral({ paidAt: r.paidAt, status: r.status }))

    return NextResponse.json({
      referralCode,
      commissionPercent: Number(config?.pct ?? 10),
      assignedCount: items.filter((i) => i.assignedToMe).length,
      referred: items.filter((i) => i.referredByMe).length,
      paidCount: items.filter((i) => i.paidAt).length,
      paidReferralCount: paidReferrals.length,
      paidReferralTotalGhs: roundGhs(paidReferrals.reduce((sum, r) => sum + Number(r.referralCommissionGhs || 0), 0)),
      totalEarned: earned,
      pendingEarnings: pending,
      items,
    })
  } catch (error) {
    console.error('Earnings error:', error)
    return NextResponse.json({ error: 'Could not load earnings.' }, { status: 500 })
  }
}
