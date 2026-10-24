import { NextResponse } from 'next/server'
import { getVapidPublicKey } from '@/lib/push'

export const runtime = 'nodejs'

// Public: browsers need this key to create a push subscription
export async function GET() {
  try {
    const publicKey = await getVapidPublicKey()
    if (!publicKey) return NextResponse.json({ error: 'Push is not configured.' }, { status: 503 })
    return NextResponse.json({ publicKey })
  } catch (error) {
    console.error('Push key error:', error)
    return NextResponse.json({ error: 'Push is unavailable.' }, { status: 500 })
  }
}
