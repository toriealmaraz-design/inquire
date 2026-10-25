import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { getUser } from '@/lib/auth'
import { isField } from '@/lib/fields'
import { sendPush } from '@/lib/push'

export const runtime = 'nodejs'

const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')
const list = (v: unknown, max = 40, n = 60) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x) => x.trim().slice(0, n)).filter(Boolean).slice(0, max) : [])
const num = (v: unknown, lo: number, hi: number) => {
  const x = Number(v)
  return Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.round(x))) : null
}

// Approved staff: save the skills questionnaire (once; can be re-submitted to update)
export async function POST(request: Request) {
  const user = await getUser()
  if (!user || user.status !== 'active') return NextResponse.json({ error: 'Your account must be approved first.' }, { status: 403 })

  const b = await request.json().catch(() => null)
  if (!b) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const fields = list(b.fields, 3).filter(isField)
  const primaryField = isField(b.primaryField) ? b.primaryField : fields[0]
  if (!fields.length || !primaryField) return NextResponse.json({ error: 'Pick at least one field you work in.' }, { status: 400 })
  if (!str(b.phone, 30)) return NextResponse.json({ error: 'Add a phone number the team can reach you on.' }, { status: 400 })
  if (b.agreeConfidential !== true) return NextResponse.json({ error: 'Please accept the confidentiality agreement.' }, { status: 400 })

  const profile = {
    phone: str(b.phone, 30),
    city: str(b.city, 60),
    education: str(b.education, 40),
    institution: str(b.institution, 120),
    programme: str(b.programme, 120),
    fields,
    primaryField,
    skills: list(b.skills, 60),
    otherSkills: str(b.otherSkills, 300),
    subjects: list(b.subjects, 20),
    levels: list(b.levels, 6),
    citationStyles: list(b.citationStyles, 10),
    tools: list(b.tools, 40),
    experienceYears: num(b.experienceYears, 0, 40),
    hoursPerWeek: num(b.hoursPerWeek, 1, 80),
    days: list(b.days, 7),
    urgentOk: b.urgentOk === true,
    maxJobs: num(b.maxJobs, 1, 20),
    portfolio: str(b.portfolio, 300),
    bio: str(b.bio, 800),
    momoNumber: str(b.momoNumber, 20),
    momoNetwork: str(b.momoNetwork, 20),
    agreeConfidential: true,
    submittedAt: new Date().toISOString(),
  }

  const first = !user.onboardedAt
  await db
    .update(users)
    .set({ profile, onboardedAt: new Date(), field: user.field || primaryField, updatedAt: new Date() })
    .where(eq(users.id, user.id))

  if (first) {
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, 'super_admin'))
    sendPush({ userIds: admins.map((a) => a.id) }, { title: 'Questionnaire completed', body: `${user.name} finished their skills profile.`, url: '/dashboard' }).catch(() => {})
  }
  return NextResponse.json({ ok: true })
}
