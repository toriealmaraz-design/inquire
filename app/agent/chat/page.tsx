import { redirect } from 'next/navigation'
import { getUser, canChat } from '@/lib/auth'
import { AgentChatClient } from './client'

// Signed-in pages read cookies; never prerender them.
export const dynamic = 'force-dynamic'

export default async function AgentChatPage() {
  const user = await getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const { status, role } = user

  if (status !== 'active') {
    redirect('/dashboard')
  }

  if (!canChat(role)) {
    redirect('/dashboard')
  }

  return <AgentChatClient user={{
    id: String(user.id),
    name: user.name,
    email: user.email,
    image: user.avatar,
    role: user.role,
  }} />
}
