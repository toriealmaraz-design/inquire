import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getPageUser, isAdmin, needsOnboarding } from '@/lib/auth'
import { ComplaintForm } from '@/components/complaints'
import { ContactSuperAdmin } from '@/components/contact-super-admin'
import { NotificationBell } from '@/components/notification-bell'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Complaints | Gemini Nexus' }

export default async function ComplaintsPage() {
  const user = await getPageUser()
  if (!user) redirect('/auth/signin?redirectTo=/complaints')
  if (user.status !== 'active') redirect('/dashboard')
  if (needsOnboarding(user)) redirect('/onboarding')
  const admin = isAdmin(user.role)
  return (
    <main className="min-h-screen bg-[#06121d] px-4 py-6 text-white sm:px-6 sm:py-8">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute right-0 top-0 size-[34rem] rounded-full bg-indigo-500/15 blur-[140px]" />
      </div>
      <div className="relative mx-auto flex max-w-3xl flex-col gap-5">
        <div className="flex items-center justify-between">
          <a href={admin ? '/dashboard' : '/agent/dashboard'} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white"><ArrowLeft className="size-4" /> Back to dashboard</a>
          <NotificationBell />
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Complaints</h1>
        {admin && user.role !== 'super_admin' && <ContactSuperAdmin />}
        <ComplaintForm />
      </div>
    </main>
  )
}
