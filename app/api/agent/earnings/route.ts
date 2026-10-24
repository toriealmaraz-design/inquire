import { NextResponse } from 'next/server'
import { desc, eq, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings, submissions } from '@/lib/db/schema'
import { ensureReferralCode, getStaffUser } from '@/lib/auth'
import { briefTitle } from '@/lib/fields'

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
          assignedTo: submissions.assignedTo,
          referredBy: submissions.referredBy,
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

    const items = rows.map((r) => {
      const mine =
        (r.assignedTo === user.id ? Number(r.commissionGhs || 0) : 0) +
        (r.referredBy === user.id ? Number(r.referralCommissionGhs || 0) : 0)
      const assignedToMe = r.assignedTo === user.id
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
        priceGhs: assignedToMe ? r.priceGhs : null,
        myCommission: Math.round(mine * 100) / 100,
        assignedToMe,
        referredByMe: r.referredBy === user.id,
        paidAt: r.paidAt,
        createdAt: r.createdAt,
      }
    })

    const round = (n: number) => Math.round(n * 100) / 100
    const earned = round(items.filter((i) => i.paidAt).reduce((s, i) => s + i.myCommission, 0))
    const pending = round(items.filter((i) => !i.paidAt).reduce((s, i) => s + i.myCommission, 0))

    return NextResponse.json({
      referralCode,
      commissionPercent: Number(config?.pct ?? 10),
      assignedCount: items.filter((i) => i.assignedToMe).length,
      referred: items.filter((i) => i.referredByMe).length,
      paidCount: items.filter((i) => i.paidAt).length,
      totalEarned: earned,
      pendingEarnings: pending,
      items,
    })
  } catch (error) {
    console.error('Earnings error:', error)
    return NextResponse.json({ error: 'Could not load earnings.' }, { status: 500 })
  }
}
