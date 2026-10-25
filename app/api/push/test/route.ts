import { NextResponse } from 'next/server'
import { getStaffUser } from '@/lib/auth'
import { sendPush } from '@/lib/push'

export const runtime = 'nodejs'

// Signed-in staff: send a test notification to all of your own devices
export async function POST() {
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 403 })
  const sent = await sendPush({ userIds: [user.id] }, { title: 'Notifications are working ✅', body: 'You will get alerts for new client messages, briefs, assignments and announcements.', url: '/dashboard', tag: 'test' })
  return NextResponse.json({ sent })
}
