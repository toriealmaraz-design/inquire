import { redirect } from 'next/navigation'
import { needsOnboarding, getPageUser, isAdmin } from '@/lib/auth'
import { AgentChatClient } from './client'

// Signed-in pages read cookies; never prerender them.
export const dynamic = 'force-dynamic'

export default async function AgentChatPage() {
  const user = await getPageUser()

  if (!user) {
    redirect('/auth/signin')
  }
  if (needsOnboarding(user)) redirect('/onboarding')

  const { status, role } = user

  if (status !== 'active') {
    redirect('/dashboard')
  }

  // Only admins chat with clients; agents work from their portal
  if (!isAdmin(role)) {
    redirect('/agent/dashboard')
  }

  return <AgentChatClient user={{
    id: String(user.id),
    name: user.name,
    email: user.email,
    image: user.avatar,
    role: user.role,
    field: user.field,
  }} />
}
