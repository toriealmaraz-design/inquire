import { redirect } from 'next/navigation'
import { getUser, canChat } from '@/lib/auth'
import { AgentDashboardClient } from './client'

export default async function AgentDashboardPage() {
  const user = await getUser()

  if (!user) redirect('/auth/signin')
  if (user.status !== 'active') redirect('/dashboard')
  if (!canChat(user.role)) redirect('/dashboard')

  return (
    <AgentDashboardClient
      user={{
        id: String(user.id),
        name: user.name,
        email: user.email,
        image: user.avatar,
        role: user.role,
      }}
    />
  )
}
