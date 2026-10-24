import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

// Secret email that auto-becomes super_admin
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL

// Helper to check roles
export const ADMIN_ROLES = ['super_admin', 'academic_lead', 'it_graphics_lead', 'field_specialist']
export const CHAT_ROLES = [...ADMIN_ROLES, 'agent']

export function isAdmin(role: string | null | undefined): boolean {
  return role ? ADMIN_ROLES.includes(role) : false
}

export function canChat(role: string | null | undefined): boolean {
  return role ? CHAT_ROLES.includes(role) : false
}

export type AppUser = {
  id: number
  email: string
  name: string
  avatar: string | null
  role: string | null
  status: string
  field: string | null
  referralCode: string | null
}

// Active staff member (any chat role) or null
export async function getStaffUser(): Promise<AppUser | null> {
  const user = await getUser()
  return user && user.status === 'active' && canChat(user.role) ? user : null
}

// Give a staff member a unique referral code (created once, then reused)
export async function ensureReferralCode(user: AppUser): Promise<string> {
  if (user.referralCode) return user.referralCode
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = Math.random().toString(36).slice(2, 10).toUpperCase()
    try {
      const [row] = await db
        .update(users)
        .set({ referralCode: code })
        .where(and(eq(users.id, user.id), isNull(users.referralCode)))
        .returning({ referralCode: users.referralCode })
      if (row?.referralCode) return row.referralCode
      // Someone else set it concurrently: read it back
      const [existing] = await db.select({ referralCode: users.referralCode }).from(users).where(eq(users.id, user.id)).limit(1)
      if (existing?.referralCode) return existing.referralCode
    } catch {
      // unique collision: try another code
    }
  }
  throw new Error('Could not create referral code')
}

// Thrown when someone IS signed in with Supabase but our database can't be reached.
export class AccountLookupError extends Error {}

// For pages: signed out -> null; database failure -> AccountLookupError (no silent sign-in loop)
export async function getUserOrThrow(): Promise<AppUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  try {
    return await loadAppUser(user)
  } catch (error) {
    console.error('Account lookup failed (check DATABASE_URL):', error)
    throw new AccountLookupError('account_lookup_failed')
  }
}

// For pages: like getUserOrThrow, but a database failure sends the person to the
// sign-in page WITH an explanation instead of looping silently.
export async function getPageUser(): Promise<AppUser | null> {
  let user: AppUser | null = null
  let failed = false
  try {
    user = await getUserOrThrow()
  } catch (error) {
    if (!(error instanceof AccountLookupError)) throw error
    failed = true
  }
  if (failed) redirect('/auth/signin?error=account_lookup_failed')
  return user
}

// For API routes: any failure -> null (routes answer 403)
export async function getUser(): Promise<AppUser | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return null
    return await loadAppUser(user)
  } catch (error) {
    console.error('getUser error:', error)
    return null
  }
}

type AuthUser = { id: string; email?: string; user_metadata?: Record<string, any> }

async function loadAppUser(user: AuthUser): Promise<AppUser> {
  const email = (user.email || '').toLowerCase()
  if (!email) throw new Error('Auth user has no email')
  const meta = user.user_metadata || {}

  const [dbUser] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (dbUser) {
    const updates: Record<string, any> = {}
    if (meta.avatar_url && meta.avatar_url !== dbUser.avatar) updates.avatar = meta.avatar_url
    if (meta.full_name && meta.full_name !== dbUser.name) updates.name = meta.full_name
    if (Object.keys(updates).length) {
      await db.update(users).set({ ...updates, updatedAt: new Date() }).where(eq(users.id, dbUser.id))
    }
    return { ...dbUser, ...updates }
  }

  // New account: default role 'agent'; the super admin email gets 'super_admin'
  const isSuperAdmin = !!SUPER_ADMIN_EMAIL && email === SUPER_ADMIN_EMAIL.toLowerCase()
  const [newUser] = await db
    .insert(users)
    .values({
      authId: user.id,
      email,
      name: meta.full_name || meta.name || email.split('@')[0],
      avatar: meta.avatar_url || null,
      role: isSuperAdmin ? 'super_admin' : 'agent',
      status: 'active', // auto-approve
    })
    .onConflictDoNothing()
    .returning()
  if (newUser) return newUser

  // Created at the same moment by another tab: read it back
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (existing) return existing
  throw new Error('Could not create account row')
}

// Check if current user is super admin
export async function requireSuperAdmin(): Promise<boolean> {
  const user = await getUser()
  return user?.role === 'super_admin'
}
