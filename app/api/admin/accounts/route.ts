import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { staffAccounts } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/app/api/admin/session/route'

const scrypt = promisify(nodeScrypt)
const roles = ['Academic Lead', 'IT/Graphics Lead', 'Field Specialist'] as const

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64) as Buffer
  return `${salt}:${derived.toString('hex')}`
}

export async function verifyStaffPassword(password: string, stored: string) {
  const [salt, key] = stored.split(':')
  if (!salt || !key) return false
  const derived = await scrypt(password, salt, 64) as Buffer
  const expected = Buffer.from(key, 'hex')
  return expected.length === derived.length && timingSafeEqual(expected, derived)
}

export async function GET(request: Request) {
  if (!await requireSuperAdmin(request)) return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 })
  const rows = await db.select({ id: staffAccounts.id, fullName: staffAccounts.fullName, email: staffAccounts.email, role: staffAccounts.role, mustChangePassword: staffAccounts.mustChangePassword, active: staffAccounts.active, createdAt: staffAccounts.createdAt }).from(staffAccounts).orderBy(asc(staffAccounts.fullName))
  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  if (!await requireSuperAdmin(request)) return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim().slice(0, 120) : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase().slice(0, 160) : ''
  const role = typeof body?.role === 'string' ? body.role : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!fullName || !/^\S+@\S+\.\S+$/.test(email) || !roles.includes(role as typeof roles[number]) || password.length < 8) return NextResponse.json({ error: 'Name, valid email, role, and an 8-character minimum password are required.' }, { status: 400 })
  try {
    const [account] = await db.insert(staffAccounts).values({ fullName, email, role, passwordHash: await hashPassword(password) }).returning({ id: staffAccounts.id, fullName: staffAccounts.fullName, email: staffAccounts.email, role: staffAccounts.role, mustChangePassword: staffAccounts.mustChangePassword, active: staffAccounts.active })
    return NextResponse.json(account, { status: 201 })
  } catch (error: any) {
    if (error?.code === '23505') return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 })
    return NextResponse.json({ error: 'Unable to create account.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  if (!await requireSuperAdmin(request)) return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const id = Number(body?.id)
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: 'A valid account is required.' }, { status: 400 })
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (typeof body?.active === 'boolean') updates.active = body.active
  if (typeof body?.password === 'string' && body.password.length >= 8) { updates.passwordHash = await hashPassword(body.password); updates.mustChangePassword = true }
  const [account] = await db.update(staffAccounts).set(updates).where(eq(staffAccounts.id, id)).returning({ id: staffAccounts.id, active: staffAccounts.active, mustChangePassword: staffAccounts.mustChangePassword })
  return account ? NextResponse.json(account) : NextResponse.json({ error: 'Account not found.' }, { status: 404 })
}
