import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/lib/auth'

export const runtime = 'nodejs'

const clean = (value: unknown, maxLength: number) => typeof value === 'string' ? value.trim().slice(0, maxLength) : ''

const publicDefaults = { whatsapp: '233206478727', telegram: 'GeminiNexusAdmin', instagram: 'GeminiNexusAdmin', snapchat: 'GeminiNexus' }

export async function GET() {
  try {
    const [row] = await db.select({
      whatsapp: settings.whatsappNumber,
      telegram: settings.telegramUsername,
      instagram: settings.instagramUsername,
      snapchat: settings.snapchatUsername,
    }).from(settings).where(eq(settings.id, 1)).limit(1)
    return NextResponse.json(row ?? publicDefaults)
  } catch {
    return NextResponse.json(publicDefaults)
  }
}

export async function PATCH(request: Request) {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const values = {
      whatsappNumber: clean(body.whatsapp, 20),
      telegramUsername: clean(body.telegram, 50),
      instagramUsername: clean(body.instagram, 50),
      snapchatUsername: clean(body.snapchat, 50),
      updatedAt: new Date(),
    }
    await db
      .insert(settings)
      .values({ id: 1, ...values })
      .onConflictDoUpdate({ target: settings.id, set: values })

    const [row] = await db.select({
      whatsapp: settings.whatsappNumber,
      telegram: settings.telegramUsername,
      instagram: settings.instagramUsername,
      snapchat: settings.snapchatUsername,
    }).from(settings).where(eq(settings.id, 1)).limit(1)

    return NextResponse.json(row ?? publicDefaults)
  } catch (error) {
    console.error('Settings PATCH error:', error)
    return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 })
  }
}
