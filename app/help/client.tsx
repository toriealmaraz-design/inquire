'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, Search, ShieldCheck } from 'lucide-react'

type Level = 'agent' | 'admin' | 'lead' | 'super'
type Section = { id: string; title: string; min: Level; steps?: string[]; body?: string; tips?: string[] }

const RANK: Record<Level, number> = { agent: 0, admin: 1, lead: 2, super: 3 }
const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'

function levelOf(role: string | null): Level {
  if (role === 'super_admin') return 'super'
  if (['academic_lead', 'it_graphics_lead', 'field_specialist'].includes(role || '')) return 'lead'
  if (role === 'admin') return 'admin'
  return 'agent'
}

const ROLE_NAME: Record<Level, string> = { agent: 'Agent', admin: 'Admin', lead: 'Field Lead', super: 'Super Admin' }

const GROUPS: { title: string; sections: Section[] }[] = [
  {
    title: 'Getting started',
    sections: [
      { id: 'account', title: 'Your account and approval', min: 'agent', steps: ['Sign up with Google or email from Staff sign-in (the key icon at the top of the website).', 'Your account starts as Pending. The super admin reviews it and approves or rejects it.', 'After approval you complete a short skills questionnaire (about 3 minutes). Admins use it to send you the right work.', 'You then land on your dashboard. Sign out from the top-right corner.'], tips: ['Pending for a long time? Ask the super admin to check User Management.', 'Changed role? Your page reloads into the right dashboard within about 15 seconds.'] },
      { id: 'profile', title: 'Edit your skills profile', min: 'agent', steps: ['Open your dashboard and click "Edit my skills profile" (or go to /onboarding).', 'Update your fields, skills, availability or Mobile Money number.', 'Click Save profile on the last step.'], tips: ['Keep your availability and MoMo number up to date: they decide what work you get and where commission is paid.'] },
      { id: 'complaints', title: 'Lodge a complaint', min: 'agent', steps: ['Click "Lodge a complaint" on your portal (or open /complaints).', 'Choose a category (payment, assignment, another staff member, technical, client, suggestion), add a subject and describe the problem.', 'Tick "Hide my name" to stay anonymous: only the super admin can see who sent it.', 'Click Send complaint. Admins are notified at once, and their reply and status (Open → In review → Resolved) appear under My complaints and in your bell.'] },
      { id: 'notifications', title: 'Notifications (bell and push)', min: 'agent', steps: ['When the yellow banner appears, click Turn on and allow notifications in your browser.', 'Click Send test to confirm a notification pops up on this device.', 'The bell (top right) keeps every alert: unread ones are highlighted with a red count. Click one to open it, or Mark all read.', 'Repeat Turn on for every device you use (phone and laptop).'], tips: ['Blocked? Click the lock icon next to the address bar, set Notifications to Allow, then reload.', 'iPhone: open the site in Safari, tap Share → Add to Home Screen, open it from the home screen, then turn on notifications.', 'The browser tab also shows your unread count, e.g. "(3) Gemini Nexus".'] },
    ],
  },
  {
    title: 'Agents: doing the work',
    sections: [
      { id: 'assignments', title: 'My assignments', min: 'agent', steps: ['Admins assign jobs to you with a price. You get a notification ("New assignment: …").', 'Open your Agent Portal → My assignments to see the title, brief, scope, urgency, price and your commission.', 'Deliver through the admin who assigned it. They handle all client contact.'], tips: ['For privacy, agents never see client contact details or uploaded files. Ask your admin if you need a file.'] },
      { id: 'commission', title: 'Commission and earnings', min: 'agent', body: 'You earn the commission % (set by the super admin) of every job price assigned to you. It shows as Pending until an admin marks the job paid, then it moves to Earned. Payouts go to the Mobile Money number in your profile.' },
      { id: 'referrals', title: 'Your referral link', min: 'agent', steps: ['Copy your link from the Agent Portal (Your referral link → Copy link).', 'Share it with potential clients. The link is remembered for 30 days on their device.', 'When they submit a brief through it, it is credited to you, and you earn a referral commission once that job is paid.'] },
      { id: 'leaderboard', title: 'Leaderboard and promotion', min: 'agent', body: 'Agents are ranked by paid jobs, then commission, then referrals (this month or all time). The top 3 can be promoted by the super admin to Admin, who can chat with clients and assign work.' },
      { id: 'rules', title: 'Confidentiality rules', min: 'agent', tips: ['Never contact clients outside Gemini Nexus.', 'Keep all client work and information private.', 'Deliver original work and follow the brief exactly.', 'We do not take exams or tests on anyone’s behalf.'] },
    ],
  },
  {
    title: 'Admins: clients and jobs',
    sections: [
      { id: 'livechat', title: 'Live chat console', min: 'admin', steps: ['Open Chat Console from your dashboard (or /agent/chat).', 'The green banner shows how many possible clients have Live Chat open right now.', 'Pick a conversation on the left and reply. Clients see when you are online and when you have read their message.', 'Use the paperclip to send files to the client.'], tips: ['You get a push the moment a client writes, then a reminder every 3 minutes until someone replies ("waiting 5 min" → "please reply").', 'Messages marked Auto-reply were sent by the chatbot (greeting, away message, keyword answers, ticket status).'] },
      { id: 'clients', title: 'Clients & assignments (briefs)', min: 'admin', steps: ['Go to Dashboard → Submissions. Each client has one folder with all their briefs and chat files.', 'Use the search box (name, contact, ticket number, file) and the All / Open / Assigned / Paid filters.', 'Inside a brief, pick an agent under "Assign to…", enter the price in GHS, and click Assign. The price is required, and the agent sees their commission straight away.', 'Click the pencil next to a title to rename the brief. Click Read brief for the full text, and Download for attachments.'], tips: ['Ticket numbers look like AC-2610-001: track (AC Academic, MD Media, IT Systems), year and month, then the count.', 'Uploaded files are deleted automatically after 7 days. Download anything you need to keep.'] },
      { id: 'handle-complaints', title: 'Handle staff complaints', min: 'admin', steps: ['Dashboard → Complaints shows everything that needs action (switch to All for history).', 'Read the complaint, type a reply and click Send reply. The person is notified.', 'Change the status from the dropdown, or click Resolve when it is sorted.'] },
      { id: 'contact-super', title: 'Contact the super admin', min: 'admin', body: 'Dashboard → Complaints (and the /complaints page) shows the super admin’s WhatsApp, Telegram, Instagram, Snapchat and email buttons, for anything urgent. These handles are only visible to admins.' },
      { id: 'chatbot-use', title: 'How the chatbot helps clients', min: 'admin', body: 'Clients can ask the homepage assistant about prices, deadlines, payment and files, or type their ticket number to check its status. If it cannot answer, it hands the client to Live Chat with their question already typed.' },
    ],
  },
  {
    title: 'Field leads',
    sections: [
      { id: 'paid', title: 'Mark jobs paid', min: 'lead', steps: ['When the client has paid, open the brief in Submissions.', 'Click Mark paid and confirm. The commission becomes Earned for the agent (and the referrer) and the job is locked.'] },
      { id: 'announce', title: 'Post announcements', min: 'lead', steps: ['Dashboard → Announcements → New announcement.', 'Write a title and message and click Send announcement.', 'Leads post to staff in their own field. Everyone in that field gets a notification.'] },
      { id: 'analytics', title: 'Overview analytics', min: 'lead', body: 'The Overview tab shows revenue this month (compared with last month), briefs, pipeline value, conversion to paid, a 30-day chart (hover a bar), the job pipeline with average times, breakdowns by track and urgency, chat response time, team stats, top performers and questions the chatbot could not answer. Alert buttons at the top jump straight to what needs action.' },
    ],
  },
  {
    title: 'Super admin',
    sections: [
      { id: 'users', title: 'Approve, reject, remove and delete people', min: 'super', steps: ['Dashboard → User Management.', 'Pending people: Approve or Reject. Approved people must then complete the skills questionnaire.', 'Change anyone’s Role (Agent, Admin, Field Specialist, Leads) and Field from the dropdowns. It applies within about 15 seconds.', 'Remove takes access away (Enable brings it back). Delete removes the account permanently.', 'Click View skills profile to read someone’s questionnaire answers.'] },
      { id: 'edit-all', title: 'Edit or delete anything', min: 'super', tips: ['Briefs: Edit changes every detail (even paid jobs, including "mark as NOT paid"). The trash icon deletes a brief and its file.', 'Client folders: the trash icon deletes all that client’s briefs and files.', 'Chats: delete a whole conversation from the Chats tab, or single messages in the chat console.', 'Files, announcements and users each have their own Delete. Every delete asks you to confirm and cannot be undone.'] },
      { id: 'settings', title: 'Settings: commission and chatbot', min: 'super', steps: ['Dashboard → Settings.', 'Set the agent commission %, which is used whenever a job is priced.', 'Under Chatbot & automatic replies: edit the greeting, the away message, and the answers (question, keywords, reply). Reorder, switch off or delete answers, then click Save chatbot.', 'Questions the chatbot could not answer appear in yellow. Click Add answer to turn one into a new answer.'] },
      { id: 'handles', title: 'Your contact handles', min: 'super', body: 'In Settings → Your contact handles, add your WhatsApp, Telegram, Instagram, Snapchat and email. Admins see them as buttons so they can reach you directly. Clients and agents never see them. Anonymous complaints still show you the sender’s name.' },
      { id: 'promote', title: 'Promote top agents', min: 'super', body: 'In the Leaderboard tab, the top 3 agents with paid jobs show a Promote button. Promotion makes them an Admin (chat with clients, see briefs and files, assign jobs; no paying, announcements or user management).' },
    ],
  },
  {
    title: 'Troubleshooting',
    sections: [
      { id: 'signin', title: 'Sign-in problems', min: 'agent', tips: ['"Awaiting approval": the super admin has not approved you yet.', '"Couldn’t load your account": the server could not reach the database. Wait a minute and try again.', 'Started sign-in in another tab or browser? Click Continue with Google again on the same page.', 'Forgot password: click "Forgot password? Email me a sign-in link" on the sign-in page.'] },
      { id: 'nonotif', title: 'Not getting notifications', min: 'agent', tips: ['Check the bell: every alert is saved there even if push is off.', 'Click Send test on your dashboard. If nothing appears, allow notifications for the site in your browser settings and reload.', 'Windows/Mac: make sure system notifications are on for your browser and Do Not Disturb is off.', 'Phones: battery saver can delay notifications.'] },
    ],
  },
]

const CAN: { label: string; min: Level }[] = [
  { label: 'See and do your assignments, commission and referral link', min: 'agent' },
  { label: 'Chat with clients in Live Chat', min: 'admin' },
  { label: 'See client briefs, contacts and files', min: 'admin' },
  { label: 'Assign jobs and set prices', min: 'admin' },
  { label: 'Lodge complaints and follow replies', min: 'agent' },
  { label: 'Answer staff complaints and contact the super admin', min: 'admin' },
  { label: 'Mark jobs paid', min: 'lead' },
  { label: 'Post announcements', min: 'lead' },
  { label: 'Manage users, roles and settings', min: 'super' },
  { label: 'Edit or delete anything', min: 'super' },
]

export function HelpClient({ role, status, name }: { role: string | null; status: string; name: string }) {
  const level = levelOf(role)
  const [q, setQ] = useState('')
  const home = level === 'agent' ? '/agent/dashboard' : '/dashboard'

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase()
    return GROUPS.map((g) => ({
      ...g,
      sections: g.sections.filter(
        (s) => RANK[s.min] <= RANK[level] && (!term || [s.title, s.body, ...(s.steps || []), ...(s.tips || [])].join(' ').toLowerCase().includes(term))
      ),
    })).filter((g) => g.sections.length)
  }, [q, level])

  return (
    <main className="min-h-screen bg-[#06121d] px-5 py-8 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-24 size-96 rounded-full bg-cyan-400/10 blur-[110px]" />
        <div className="absolute right-0 top-0 size-[34rem] rounded-full bg-indigo-500/15 blur-[140px]" />
      </div>
      <div className="relative mx-auto grid max-w-6xl gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-8 lg:h-fit">
          <a href={home} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white"><ArrowLeft className="size-4" /> Back to dashboard</a>
          <div className={`${glass} mt-4 rounded-3xl p-5`}>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-cyan-300"><BookOpen className="size-3.5" /> Staff manual</p>
            <p className="mt-3 text-sm text-slate-300">Hi {name.split(' ')[0]}, this guide shows what your role can do.</p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100"><ShieldCheck className="size-3.5" /> {ROLE_NAME[level]}{status !== 'active' ? ` · ${status}` : ''}</p>
          </div>
          <nav className={`${glass} mt-4 hidden rounded-3xl p-4 lg:block`} aria-label="Contents">
            {groups.map((g) => (
              <div key={g.title} className="mb-3 last:mb-0">
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">{g.title}</p>
                {g.sections.map((s) => <a key={s.id} href={`#${s.id}`} className="mt-1 block truncate text-xs text-slate-300 hover:text-cyan-200">{s.title}</a>)}
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex flex-col gap-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the manual (e.g. assign, commission, notifications)…" aria-label="Search the manual" className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-500/50" />
          </div>

          {!q && (
            <div className={`${glass} rounded-3xl p-5 sm:p-6`}>
              <h2 className="font-bold">What your role can do</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {CAN.map((c) => {
                  const ok = RANK[c.min] <= RANK[level]
                  return (
                    <li key={c.label} className={`flex items-start gap-2 text-sm ${ok ? 'text-slate-200' : 'text-slate-600 line-through'}`}>
                      <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${ok ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/5 text-slate-600'}`}>{ok ? '✓' : '–'}</span>
                      {c.label}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {groups.length === 0 && <p className="rounded-2xl border border-white/10 p-6 text-center text-sm text-slate-500">Nothing matches &ldquo;{q}&rdquo;.</p>}

          {groups.map((g) => (
            <section key={g.title} aria-label={g.title} className="flex flex-col gap-4">
              <h2 className="mt-2 text-xs font-bold uppercase tracking-[.18em] text-slate-400">{g.title}</h2>
              {g.sections.map((s) => (
                <article key={s.id} id={s.id} className={`${glass} scroll-mt-6 rounded-3xl p-5 sm:p-6`}>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  {s.body && <p className="mt-2 text-sm leading-6 text-slate-300">{s.body}</p>}
                  {s.steps && (
                    <ol className="mt-3 space-y-2">
                      {s.steps.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm leading-6 text-slate-300">
                          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-xs font-bold text-cyan-200">{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  )}
                  {s.tips && (
                    <ul className="mt-3 space-y-1.5 rounded-2xl border border-white/10 bg-black/15 p-4">
                      {s.tips.map((t, i) => <li key={i} className="flex gap-2 text-sm leading-6 text-slate-300"><span className="text-cyan-300">•</span>{t}</li>)}
                    </ul>
                  )}
                </article>
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
