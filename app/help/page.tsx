import { redirect } from 'next/navigation'
import { getPageUser } from '@/lib/auth'
import { HelpClient } from './client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Staff manual | Gemini Nexus' }

export default async function HelpPage() {
  const user = await getPageUser()
  if (!user) redirect('/auth/signin?redirectTo=/help')
  return <HelpClient role={user.role} status={user.status} name={user.name} />
}
