import { createClient } from '@/lib/supabase/server'
import { eq } from 'drizzle-orm'
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
}

// Get current user with app-level data
export async function getUser(): Promise<AppUser | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) return null

    // Check if user exists in our users table
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, user.email.toLowerCase()))
      .limit(1)

    if (dbUser) {
      // Update avatar/name if changed
      const updates: Record<string, any> = { updatedAt: new Date() }
      if (user.user_metadata?.avatar_url && user.user_metadata.avatar_url !== dbUser.avatar) {
        updates.avatar = user.user_metadata.avatar_url
      }
      if (user.user_metadata?.full_name && user.user_metadata.full_name !== dbUser.name) {
        updates.name = user.user_metadata.full_name
      }
      if (Object.keys(updates).length > 1) {
        await db.update(users).set(updates).where(eq(users.id, dbUser.id))
      }
      return dbUser
    }

    // Create new user - default role is 'agent', super admin email gets 'super_admin'
    const isSuperAdmin = SUPER_ADMIN_EMAIL && user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
    const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0]

    const [newUser] = await db
      .insert(users)
      .values({
        authId: user.id,
        email: user.email.toLowerCase(),
        name: userName,
        avatar: user.user_metadata?.avatar_url || null,
        role: isSuperAdmin ? 'super_admin' : 'agent',
        status: isSuperAdmin ? 'active' : 'active', // Auto-approve all users
      })
      .returning()

    return newUser
  } catch (error) {
    console.error('getUser error:', error)
    return null
  }
}

// Check if current user is super admin
export async function requireSuperAdmin(): Promise<boolean> {
  const user = await getUser()
  return user?.role === 'super_admin'
}
