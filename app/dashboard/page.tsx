import { redirect } from 'next/navigation'
import { getPageUser, isAdmin } from '@/lib/auth'
import { DashboardClient } from './client'
import { SignOutButton } from './signout-button'

// Signed-in pages read cookies; never prerender them.
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getPageUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const { status, role, email } = user

  // Pending users
  if (status === 'pending') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#06121d] px-5">
        <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
          <div className="absolute -left-24 top-24 size-96 rounded-full bg-cyan-400/10 blur-[110px]" />
          <div className="absolute right-0 top-0 size-[34rem] rounded-full bg-indigo-500/15 blur-[140px]" />
        </div>
        <div className="w-full max-w-sm border border-white/15 bg-white/[0.075] backdrop-blur-2xl shadow-2xl shadow-black/20 rounded-[2rem] p-8 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-300/15 text-amber-300">
            <svg className="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h1 className="mt-6 text-xl font-bold text-white">Awaiting Approval</h1>
          <p className="mt-2 text-sm text-slate-400">Your account is pending admin approval. You'll be notified once approved.</p>
          <p className="mt-4 text-xs text-slate-500">Signed in as: {email}</p>
          <SignOutButton />
        </div>
      </main>
    )
  }

  // Disabled users
  if (status === 'disabled' || status === 'rejected') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#06121d] px-5">
        <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
          <div className="absolute -left-24 top-24 size-96 rounded-full bg-cyan-400/10 blur-[110px]" />
          <div className="absolute right-0 top-0 size-[34rem] rounded-full bg-indigo-500/15 blur-[140px]" />
        </div>
        <div className="w-full max-w-sm border border-white/15 bg-white/[0.075] backdrop-blur-2xl shadow-2xl shadow-black/20 rounded-[2rem] p-8 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-rose-300/15 text-rose-300">
            <svg className="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
          </div>
          <h1 className="mt-6 text-xl font-bold text-white">Account Disabled</h1>
          <p className="mt-2 text-sm text-slate-400">Your account has been disabled. Contact admin if this is a mistake.</p>
          <SignOutButton />
        </div>
      </main>
    )
  }

  // Agent role - redirect to agent portal
  if (role === 'agent') {
    redirect('/agent/dashboard')
  }

  // Admin roles - show dashboard
  if (!isAdmin(role)) {
    redirect('/auth/signin')
  }

  return <DashboardClient user={{
    id: String(user.id),
    name: user.name,
    email: user.email,
    image: user.avatar,
    role: user.role,
    status: user.status,
    field: user.field,
  }} />
}
