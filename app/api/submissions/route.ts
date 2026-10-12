import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings, submissions } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/app/api/admin/session/route'

export const runtime = 'nodejs'

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export async function GET(request: Request) {
  if (!await requireSuperAdmin(request)) return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 })
  const rows = await db.select().from(submissions).orderBy(desc(submissions.createdAt)).limit(100)
  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const category = clean(body.category, 50)
  const serviceType = clean(body.serviceType, 100)
  const clientContact = clean(body.clientContact, 50)
  if (!category || !serviceType || !clientContact) {
    return NextResponse.json({ error: 'Category, service type, and contact are required.' }, { status: 400 })
  }

  const [latest] = await db.select({ ticketId: submissions.ticketId }).from(submissions).orderBy(desc(submissions.id)).limit(1)
  const latestNumber = latest?.ticketId ? Number(latest.ticketId.replace(/\D/g, '')) : 1041
  const ticketId = `GN-${Number.isFinite(latestNumber) ? latestNumber + 1 : 1042}`
  const [created] = await db.insert(submissions).values({
    ticketId,
    category,
    serviceType,
    scope: clean(body.scope, 50),
    urgency: clean(body.urgency, 50),
    clientContact,
    briefDetails: clean(body.briefDetails, 1200),
    fileUrls: clean(body.fileUrls, 1000),
  }).returning()

  const [connector] = await db.select({ whatsappNumber: settings.whatsappNumber }).from(settings).where(eq(settings.id, 1)).limit(1)
  return NextResponse.json({ submission: created, whatsappNumber: connector?.whatsappNumber ?? '233206478727' }, { status: 201 })
}
