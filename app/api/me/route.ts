import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Current signed-in staff member's live role/status (used to apply role changes instantly)
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ signedIn: false }, { headers: { 'Cache-Control': 'no-store' } })
  return NextResponse.json(
    { signedIn: true, role: user.role, status: user.status, field: user.field },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
