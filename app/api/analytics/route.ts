import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getStaffUser, isAdmin } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const one = async <T,>(q: ReturnType<typeof sql>) => ((await db.execute(q)).rows[0] || {}) as T
const many = async <T,>(q: ReturnType<typeof sql>) => (await db.execute(q)).rows as T[]

// Admin overview analytics. All money in GHS.
export async function GET() {
  const user = await getStaffUser()
  if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })

  try {
    const [totals, money, timing, daily, byField, urgency, chats, response, staff, topAgents, misses] = await Promise.all([
      one<Record<string, number>>(sql`
        select count(*)::int as total,
          count(*) filter (where created_at >= now() - interval '30 days')::int as last30,
          count(*) filter (where created_at >= now() - interval '60 days' and created_at < now() - interval '30 days')::int as prev30,
          count(*) filter (where assigned_to is null and paid_at is null)::int as open,
          count(*) filter (where assigned_to is not null and paid_at is null)::int as assigned,
          count(*) filter (where paid_at is not null)::int as paid,
          count(*) filter (where referred_by is not null)::int as referred
        from submissions`),
      one<Record<string, string>>(sql`
        select coalesce(sum(price_ghs) filter (where paid_at is not null), 0) as revenue,
          coalesce(sum(price_ghs) filter (where paid_at >= date_trunc('month', now())), 0) as revenue_month,
          coalesce(sum(price_ghs) filter (where paid_at >= date_trunc('month', now()) - interval '1 month' and paid_at < date_trunc('month', now())), 0) as revenue_prev_month,
          coalesce(sum(price_ghs) filter (where assigned_to is not null and paid_at is null), 0) as pipeline,
          coalesce(avg(price_ghs) filter (where price_ghs is not null), 0) as avg_price,
          coalesce(sum(coalesce(commission_ghs,0) + coalesce(referral_commission_ghs,0)) filter (where paid_at is not null), 0) as commissions_earned,
          coalesce(sum(coalesce(commission_ghs,0) + coalesce(referral_commission_ghs,0)) filter (where paid_at is null and assigned_to is not null), 0) as commissions_pending
        from submissions`),
      one<Record<string, string | null>>(sql`
        select round(avg(extract(epoch from assigned_at - created_at) / 3600)::numeric, 1) as hours_to_assign,
          round(avg(extract(epoch from paid_at - assigned_at) / 3600)::numeric, 1) as hours_to_paid
        from submissions where assigned_at is not null`),
      many<{ day: string; briefs: number; revenue: string }>(sql`
        select to_char(d, 'YYYY-MM-DD') as day,
          (select count(*)::int from submissions s where s.created_at::date = d) as briefs,
          (select coalesce(sum(price_ghs), 0) from submissions s where s.paid_at::date = d) as revenue
        from generate_series((now() - interval '29 days')::date, now()::date, interval '1 day') d
        order by d`),
      many<{ field: string; briefs: number; revenue: string }>(sql`
        select category as field, count(*)::int as briefs, coalesce(sum(price_ghs) filter (where paid_at is not null), 0) as revenue
        from submissions group by category order by briefs desc`),
      many<{ urgency: string; n: number }>(sql`
        select coalesce(nullif(urgency, ''), 'Not set') as urgency, count(*)::int as n from submissions group by 1 order by n desc`),
      one<Record<string, number>>(sql`
        select (select count(*)::int from conversations) as conversations,
          (select count(*)::int from conversations where updated_at >= now() - interval '7 days') as active7,
          (select count(*)::int from messages where created_at >= now() - interval '7 days') as messages7,
          (select count(*)::int from messages where sender_type = 'client' and not coalesce(read, false)) as unread,
          (select count(*)::int from messages where sender_type = 'bot' and created_at >= now() - interval '30 days') as bot_replies30`),
      one<{ minutes: string | null }>(sql`
        select round(avg(extract(epoch from first_reply - first_client) / 60)::numeric, 0) as minutes from (
          select c.id,
            (select min(created_at) from messages m where m.conversation_id = c.id and m.sender_type = 'client') as first_client,
            (select min(created_at) from messages m where m.conversation_id = c.id and m.sender_type = 'agent') as first_reply
          from conversations c where c.updated_at >= now() - interval '30 days'
        ) t where first_reply is not null and first_reply > first_client`),
      one<Record<string, number>>(sql`
        select count(*) filter (where status = 'pending')::int as pending,
          count(*) filter (where status = 'active' and role = 'agent')::int as agents,
          count(*) filter (where status = 'active' and role <> 'agent')::int as admins,
          count(*) filter (where status = 'active' and role <> 'super_admin' and onboarded_at is null)::int as not_onboarded,
          (select count(distinct user_id)::int from push_subscriptions) as push_enabled
        from users`),
      many<{ name: string; paid: number; active: number; earned: string }>(sql`
        select u.name,
          count(s.id) filter (where s.paid_at is not null)::int as paid,
          count(s.id) filter (where s.paid_at is null)::int as active,
          coalesce(sum(s.commission_ghs) filter (where s.paid_at is not null), 0) as earned
        from users u join submissions s on s.assigned_to = u.id
        group by u.id order by paid desc, earned desc limit 5`),
      many<{ question: string; hits: number }>(sql`select question, hits from chatbot_misses order by hits desc, last_at desc limit 5`),
    ])

    const n = (v: unknown) => Number(v || 0)
    return NextResponse.json({
      totals,
      money: Object.fromEntries(Object.entries(money).map(([k, v]) => [k, n(v)])),
      timing: { hoursToAssign: timing.hours_to_assign === null ? null : n(timing.hours_to_assign), hoursToPaid: timing.hours_to_paid === null ? null : n(timing.hours_to_paid) },
      daily: daily.map((d) => ({ day: d.day, briefs: d.briefs, revenue: n(d.revenue) })),
      byField: byField.map((f) => ({ field: f.field, briefs: f.briefs, revenue: n(f.revenue) })),
      urgency,
      chats: { ...chats, firstResponseMinutes: response.minutes === null ? null : n(response.minutes) },
      staff,
      topAgents: topAgents.map((a) => ({ ...a, earned: n(a.earned) })),
      misses,
    })
  } catch (error) {
    console.error('Analytics failed:', error)
    return NextResponse.json({ error: 'Could not load analytics.' }, { status: 500 })
  }
}
