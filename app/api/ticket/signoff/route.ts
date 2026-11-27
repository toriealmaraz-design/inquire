import { NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { submissions } from '@/lib/db/schema'
import { normTicket, TICKET_RE } from '@/lib/fields'

export const runtime = 'nodejs'

const MAX_REVISIONS = 2

/** Compare phone formats (024…, +233…, 00233…) and emails without exposing either in responses. */
function contactKey(value: unknown): string {
  if (typeof value !== 'string') return ''
  const text = value.trim().toLowerCase()
  if (!text) return ''
  if (text.includes('@')) return text.replace(/\s+/g, '')
  const digits = text.replace(/\D/g, '')
  if (digits.length < 9) return ''
  return digits.replace(/^(?:00)?233/, '0').replace(/^0/, '').slice(-9)
}

// Public, but scoped: only a matching ticket contact may request a revision or confirm delivery.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const match = (typeof body.ticketId === 'string' ? body.ticketId : '').match(TICKET_RE)
  if (!match) return NextResponse.json({ error: 'Ticket numbers look like AC-2610-001.' }, { status: 400 })
  const ticketId = match[0].toUpperCase()
  const contact = contactKey(body.contact)
  if (!contact) return NextResponse.json({ error: 'Enter the phone number or email used for this ticket.' }, { status: 400 })
  const action = body.action === 'revision' ? 'revision' : 'signoff'

  try {
    const [row] = await db
      .select({
        id: submissions.id,
        ticketId: submissions.ticketId,
        clientContact: submissions.clientContact,
        status: submissions.status,
        paidAt: submissions.paidAt,
        revisionCount: submissions.revisionCount,
        clientSignoffAt: submissions.clientSignoffAt,
        commissionStatus: submissions.commissionStatus,
        qaChecklist: submissions.qaChecklist,
        qaSignedOffAt: submissions.qaSignedOffAt,
      })
      .from(submissions)
      .where(sql`replace(upper(${submissions.ticketId}), '-', '') = ${normTicket(ticketId)}`)
      .limit(1)
    if (!row) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 })

    const delivered = Boolean(row.paidAt) || /delivered|complete|paid/i.test(row.status || '')
    if (!delivered) return NextResponse.json({ error: 'Delivery is not confirmed for this ticket yet.' }, { status: 409 })
    // Tickets created after the checklist rollout cannot be signed off by the
    // client until internal quality assurance is signed off. Older tickets have
    // no checklist and keep working unchanged.
    if (row.qaChecklist && !row.qaSignedOffAt) {
      return NextResponse.json({ error: 'Internal quality assurance is not signed off for this ticket yet.' }, { status: 409 })
    }
    if (contactKey(row.clientContact) !== contact) {
      return NextResponse.json({ error: 'That contact does not match this ticket.' }, { status: 403 })
    }

    const revisions = Math.min(MAX_REVISIONS, Math.max(0, Number(row.revisionCount ?? 0)))
    const signedOff = Boolean(row.clientSignoffAt) || row.commissionStatus === 'AVAILABLE'

    if (action === 'revision') {
      if (signedOff) return NextResponse.json({ error: 'Delivery already confirmed — continue in WhatsApp for further changes.' }, { status: 409 })
      if (revisions >= MAX_REVISIONS) return NextResponse.json({ error: `Revision limit reached (${MAX_REVISIONS} of ${MAX_REVISIONS}). Use WhatsApp for anything else.` }, { status: 409 })
      const revisionCount = revisions + 1
      await db.update(submissions).set({ revisionCount }).where(eq(submissions.id, row.id))
      return NextResponse.json({ ok: true, action, ticketId: row.ticketId, revisionCount })
    }

    if (signedOff) {
      return NextResponse.json({
        ok: true, action, ticketId: row.ticketId, revisionCount: revisions,
        commissionStatus: 'AVAILABLE', clientSignoffAt: row.clientSignoffAt ?? null,
      })
    }

    const clientSignoffAt = new Date().toISOString()
    await db.update(submissions).set({
      clientSignoffAt: sql`${clientSignoffAt}`,
      commissionStatus: 'AVAILABLE',
    }).where(eq(submissions.id, row.id))

    return NextResponse.json({ ok: true, action, ticketId: row.ticketId, revisionCount: revisions, commissionStatus: 'AVAILABLE', clientSignoffAt })
  } catch (error) {
    console.error('Ticket sign-off failed:', error)
    return NextResponse.json({ error: 'Could not update this ticket. Please try again.' }, { status: 500 })
  }
}
