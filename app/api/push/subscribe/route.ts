import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/db/schema'
import { getStaffUser } from '@/lib/auth'

export const runtime = 'nodejs'

// Save this browser's push subscription for the signed-in staff member
export async function POST(request: Request) {
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : ''
  const p256dh = typeof body?.keys?.p256dh === 'string' ? body.keys.p256dh : ''
  const auth = typeof body?.keys?.auth === 'string' ? body.keys.auth : ''
  if (!endpoint.startsWith('https://') || !p256dh || !auth) {
    return NextResponse.json({ error: 'Invalid subscription.' }, { status: 400 })
  }

  await db
    .insert(pushSubscriptions)
    .values({ userId: user.id, endpoint, p256dh, auth })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: user.id, p256dh, auth } })

  return NextResponse.json({ ok: true })
}

// Remove this browser's subscription (e.g. on sign-out)
export async function DELETE(request: Request) {
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (typeof body?.endpoint === 'string') {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, body.endpoint))
  }
  return NextResponse.json({ ok: true })
}
