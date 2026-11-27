import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { submissions } from '@/lib/db/schema'
import { briefTitle, normTicket, TICKET_RE } from '@/lib/fields'
import { completionWindow, MAX_REVISIONS, parseFileLinks, scopeSummaryFor } from '@/components/intake/trust-terms'

export const runtime = 'nodejs'

const asIso = (value: unknown): string | null => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

// Public: status of a brief by ticket number. Returns no client contact details.
export async function GET(request: Request) {
  const raw = (new URL(request.url).searchParams.get('id') || '').match(TICKET_RE)
  if (!raw) return NextResponse.json({ error: 'Ticket numbers look like AC-2610-001.' }, { status: 400 })
  const ticketId = raw[0].toUpperCase()
  const [row] = await db
    .select({
      ticketId: submissions.ticketId,
      serviceType: submissions.serviceType,
      title: submissions.title,
      scope: submissions.scope,
      urgency: submissions.urgency,
      briefDetails: submissions.briefDetails,
      fileUrls: submissions.fileUrls,
      status: submissions.status,
      paidAt: submissions.paidAt,
      createdAt: submissions.createdAt,
      revisionCount: submissions.revisionCount,
      clientSignoffAt: submissions.clientSignoffAt,
      commissionStatus: submissions.commissionStatus,
      // No client contact fields are read in this public response.
      handoffNote: submissions.handoffNote,
      handoffAt: submissions.handoffAt,
      qaSignedOffAt: submissions.qaSignedOffAt,
    })
    .from(submissions)
    .where(sql`replace(upper(${submissions.ticketId}), '-', '') = ${normTicket(ticketId)}`)
    .limit(1)
  if (!row) return NextResponse.json({ found: false, ticketId })

  const status = row.paidAt ? 'Paid and completed' : row.status || 'Pending Quote'
  const revisionCount = Math.min(MAX_REVISIONS, Math.max(0, Number(row.revisionCount ?? 0)))
  const handoffNote = typeof row.handoffNote === 'string' ? row.handoffNote.trim().slice(0, 2000) || null : null

  return NextResponse.json({
    found: true,
    ticketId: row.ticketId,
    serviceType: row.serviceType,
    title: briefTitle(row),
    status,
    createdAt: row.createdAt,
    revisionCount,
    maxRevisions: MAX_REVISIONS,
    delivered: Boolean(row.paidAt) || /delivered|complete|paid/i.test(row.status || ''),
    clientSignoffAt: asIso(row.clientSignoffAt),
    commissionStatus: row.commissionStatus === 'AVAILABLE' ? 'AVAILABLE' : 'PENDING',
    scope: row.scope ?? null,
    urgency: row.urgency ?? null,
    scopeSummary: scopeSummaryFor(row),
    fileUrls: row.fileUrls ?? null,
    fileLinks: parseFileLinks(row.fileUrls),
    completionWindow: completionWindow(row.urgency),
    handoffNote,
    handoffAt: asIso(row.handoffAt),
    qaSignedOffAt: asIso(row.qaSignedOffAt),
  })
}
