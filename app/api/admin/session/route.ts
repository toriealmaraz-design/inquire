import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'

export const runtime = 'nodejs'
const cookieName = 'nexus_super_admin'
const secret = process.env.DATABASE_URL ?? 'nexus-runtime-secret'

function sign(value: string) {
  return createHmac('sha256', secret).update(value).digest('hex')
}

function token(passcode: string) {
  return `${Buffer.from(passcode).toString('base64url')}.${sign(passcode)}`
}

function validToken(value: string | undefined, passcode: string) {
  if (!value) return false
  const [encoded, signature] = value.split('.')
  if (!encoded || !signature) return false
  const expected = sign(passcode)
  return Buffer.byteLength(signature) === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) && encoded === Buffer.from(passcode).toString('base64url')
}

async function getPasscode() {
  const [row] = await db.select({ passcode: settings.adminPasscode }).from(settings).where(eq(settings.id, 1)).limit(1)
  return row?.passcode ?? 'nexus2026'
}

export async function GET(request: Request) {
  const passcode = await getPasscode()
  return NextResponse.json({ authenticated: validToken(request.headers.get('cookie')?.match(new RegExp(`${cookieName}=([^;]+)`))?.[1], passcode) })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const submitted = typeof body?.passcode === 'string' ? body.passcode.trim() : ''
  const passcode = await getPasscode()
  if (!submitted || submitted !== passcode) return NextResponse.json({ error: 'Invalid super admin passcode.' }, { status: 401 })
  const response = NextResponse.json({ authenticated: true, role: 'Super Admin' })
  response.cookies.set(cookieName, token(passcode), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 8, path: '/' })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false })
  response.cookies.set(cookieName, '', { httpOnly: true, expires: new Date(0), path: '/' })
  return response
}

export async function requireSuperAdmin(request: Request) {
  const passcode = await getPasscode()
  return validToken(request.headers.get('cookie')?.match(new RegExp(`${cookieName}=([^;]+)`))?.[1], passcode)
}
