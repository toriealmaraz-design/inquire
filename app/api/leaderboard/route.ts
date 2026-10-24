import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getStaffUser, isAdmin } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Row = {
  id: number
  name: string
  avatar: string | null
  field: string | null
  assigned: number
  in_progress: number
  paid_jobs: number
  referrals: number
  earned: string
}

// Agents ranked by completed (paid) jobs, then commission earned, then referrals.
// ?period=month (default) or ?period=all. Admins also see earnings; agents see ranks only.
export async function GET(request: Request) {
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 403 })

  const all = new URL(request.url).searchParams.get('period') === 'all'
  const since = all ? sql`'-infinity'::timestamp` : sql`date_trunc('month', now())`

  const { rows } = await db.execute(sql`
    select u.id, u.name, u.avatar, u.field,
      count(s.id) filter (where s.assigned_to = u.id and s.assigned_at >= ${since})::int as assigned,
      count(s.id) filter (where s.assigned_to = u.id and s.paid_at is null and s.assigned_at >= ${since})::int as in_progress,
      count(s.id) filter (where s.assigned_to = u.id and s.paid_at >= ${since})::int as paid_jobs,
      count(s.id) filter (where s.referred_by = u.id and s.created_at >= ${since})::int as referrals,
      coalesce(sum(case when s.paid_at >= ${since} then
        (case when s.assigned_to = u.id then coalesce(s.commission_ghs, 0) else 0 end) +
        (case when s.referred_by = u.id then coalesce(s.referral_commission_ghs, 0) else 0 end)
      end), 0)::numeric(10,2) as earned
    from users u
    left join submissions s on s.assigned_to = u.id or s.referred_by = u.id
    where u.role = 'agent' and u.status = 'active'
    group by u.id
    order by paid_jobs desc, earned desc, referrals desc, u.name asc
  `)

  const admin = isAdmin(user.role)
  const board = (rows as Row[]).map((r, i) => ({
    rank: i + 1,
    id: r.id,
    name: r.name,
    avatar: r.avatar,
    field: r.field,
    paidJobs: r.paid_jobs,
    inProgress: r.in_progress,
    referrals: r.referrals,
    earned: admin ? Number(r.earned) : undefined,
    isMe: r.id === user.id,
  }))

  return NextResponse.json({ period: all ? 'all' : 'month', board, canPromote: user.role === 'super_admin' })
}
