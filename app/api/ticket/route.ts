import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { submissions } from '@/lib/db/schema'
import { briefTitle } from '@/lib/fields'

export const runtime = 'nodejs'

// Public: status of a brief by ticket number. Returns no client details.
export async function GET(request: Request) {
  const raw = (new URL(request.url).searchParams.get('id') || '').toUpperCase().match(/GN-?(\d{3,6})/)
  if (!raw) return NextResponse.json({ error: 'Ticket numbers look like GN-1042.' }, { status: 400 })
  const ticketId = `GN-${raw[1]}`
  const [row] = await db
    .select({ ticketId: submissions.ticketId, serviceType: submissions.serviceType, title: submissions.title, briefDetails: submissions.briefDetails, status: submissions.status, paidAt: submissions.paidAt, createdAt: submissions.createdAt })
    .from(submissions)
    .where(sql`upper(${submissions.ticketId}) = ${ticketId}`)
    .limit(1)
  if (!row) return NextResponse.json({ found: false, ticketId })
  return NextResponse.json({ found: true, ticketId: row.ticketId, serviceType: row.serviceType, title: briefTitle(row), status: row.paidAt ? 'Paid and completed' : row.status || 'Pending Quote', createdAt: row.createdAt })
}
