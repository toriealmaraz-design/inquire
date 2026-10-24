import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings, submissions } from '@/lib/db/schema'
import { ensureReferralCode, getStaffUser } from '@/lib/auth'

export const runtime = 'nodejs'

// The signed-in staff member's referral link + commission history.
// Client contact details are deliberately NOT returned.
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
          serviceType: submissions.serviceType,
          status: submissions.status,
          commissionGhs: submissions.commissionGhs,
          paidAt: submissions.paidAt,
          createdAt: submissions.createdAt,
        })
        .from(submissions)
        .where(eq(submissions.referredBy, user.id))
        .orderBy(desc(submissions.createdAt))
        .limit(100),
      db.select({ pct: settings.commissionPercent }).from(settings).where(eq(settings.id, 1)).limit(1),
    ])

    const paid = rows.filter((r) => r.paidAt)
    const totalEarned = paid.reduce((sum, r) => sum + Number(r.commissionGhs || 0), 0)

    return NextResponse.json({
      referralCode,
      commissionPercent: Number(config?.pct ?? 10),
      referred: rows.length,
      paidCount: paid.length,
      totalEarned: Math.round(totalEarned * 100) / 100,
      items: rows,
    })
  } catch (error) {
    console.error('Earnings error:', error)
    return NextResponse.json({ error: 'Could not load earnings.' }, { status: 500 })
  }
}
