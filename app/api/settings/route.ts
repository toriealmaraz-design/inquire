import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/app/api/admin/session/route'

export const runtime = 'nodejs'

const clean = (value: unknown, maxLength: number) => typeof value === 'string' ? value.trim().slice(0, maxLength) : ''

const publicDefaults = { whatsapp: '233206478727', telegram: 'GeminiNexusAdmin' }

export async function GET() {
  const [row] = await db.select({
    whatsapp: settings.whatsappNumber,
    telegram: settings.telegramUsername,
    instagram: settings.instagramUsername,
    snapchat: settings.snapchatUsername,
  }).from(settings).where(eq(settings.id, 1)).limit(1)
  return NextResponse.json(row ?? { ...publicDefaults, instagram: 'GeminiNexusAdmin', snapchat: 'GeminiNexus' })
}

async function updateSettings(request: Request) {
  if (!await requireSuperAdmin(request)) return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid settings.' }, { status: 400 })
  const values = {
    whatsappNumber: clean(body.whatsapp ?? body.whatsapp_number, 20),
    telegramUsername: clean(body.telegram ?? body.telegram_username, 50),
    instagramUsername: clean(body.instagram ?? body.instagram_username, 50),
    snapchatUsername: clean(body.snapchat ?? body.snapchat_username, 50),
    telegramBotToken: clean(body.botToken ?? body.telegram_bot_token, 500),
    telegramChatId: clean(body.chatId ?? body.telegram_chat_id, 50),
    adminPasscode: clean(body.passcode ?? body.admin_passcode, 100),
  }
  if (!values.whatsappNumber || !values.adminPasscode) return NextResponse.json({ error: 'WhatsApp number and passcode are required.' }, { status: 400 })
  const [row] = await db.insert(settings).values({ id: 1, ...values, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.id, set: { ...values, updatedAt: new Date() } }).returning({ whatsapp: settings.whatsappNumber, telegram: settings.telegramUsername })
  return NextResponse.json({ message: 'Connectors updated successfully.', ...row })
}

export async function PATCH(request: Request) {
  return updateSettings(request)
}

export async function POST(request: Request) {
  return updateSettings(request)
}
