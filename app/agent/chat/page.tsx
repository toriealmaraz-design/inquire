import { redirect } from 'next/navigation'
import { getUser, canChat } from '@/lib/auth'
import { AgentChatClient } from './client'

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
