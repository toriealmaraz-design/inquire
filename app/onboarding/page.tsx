import { redirect } from 'next/navigation'
import { getPageUser } from '@/lib/auth'
import { OnboardingClient } from './client'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const user = await getPageUser()
  if (!user) redirect('/auth/signin')
  if (user.status !== 'active') redirect('/dashboard') // pending/rejected see their status screen
  return <OnboardingClient name={user.name} initial={(user.profile as Record<string, unknown>) || null} editing={!!user.onboardedAt} />
}
