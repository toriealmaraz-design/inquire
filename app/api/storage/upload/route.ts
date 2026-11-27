import { NextResponse } from 'next/server'
import { getStaffUser } from '@/lib/auth'
import { createUploadTicket, validateUploadInput } from '@/lib/storage/r2'

export const runtime = 'nodejs'

// Client briefs are submitted without a session; only branding assets are staff-only.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  let input
  try {
    input = validateUploadInput(body)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid upload request.' }, { status: 400 })
  }

  if (input.scope === 'site-assets') {
    const me = await getStaffUser()
    if (!me) return NextResponse.json({ error: 'Staff access required.' }, { status: 403 })
  }

  try {
    const ticket = await createUploadTicket(input)
    return NextResponse.json(ticket, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Upload ticket failed:', error)
    return NextResponse.json({ error: 'Could not prepare the upload.' }, { status: 500 })
  }
}
