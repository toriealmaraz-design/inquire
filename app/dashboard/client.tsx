'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PushPrompt } from '@/components/push-prompt'
import { SupportPresence } from '@/components/support-presence'
import { Announcements } from '@/components/announcements'
import { Leaderboard } from '@/components/leaderboard'
import { FIELDS } from '@/lib/fields'
import {
  BarChart3,
  Check,
  Clock3,
  LogOut,
  MessageCircle,
  Settings2,
  Users,
  Zap,
  UserCheck,
  UserX,
  Phone,
  Send,
  Camera,
  Save,
  ShieldCheck,
  FileText,
  Bell,
  Download,
  Megaphone,
  Trophy,
  Percent,
} from 'lucide-react'

type User = {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string | null
  status?: string
  field?: string | null
}

type DBUser = {
  id: number
  email: string
  name: string
  avatar: string | null
  role: string | null
  status: string
  field: string | null
  createdAt: string
}

type Settings = {
  whatsapp: string
  telegram: string
  instagram: string
  snapchat: string
}

type Convo = {
  id: number
  clientName: string
  lastMessage: string
  unread: number
  time: string
}

type UploadRow = {
  id: number
  conversation_id: number | null
  file_name: string
  file_url: string
  file_type: string | null
  file_size: number | null
  uploaded_by: string
  created_at: string
}

type IntakeRow = {
  id: number
  ticketId: string
  category: string
  serviceType: string
  scope: string | null
  urgency: string | null
  clientContact: string | null
  briefDetails: string | null
  fileUrls: string | null
  status: string | null
  createdAt: string | null
  referredBy: number | null
  referrerName: string | null
  assignedTo: number | null
  assigneeName: string | null
  priceGhs: string | null
  commissionGhs: string | null
  paidAt: string | null
}

type DbMsg = {
  id: number
  conversation_id: number
  sender_type: string
  content: string
  read: boolean | null
  created_at: string
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'
const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'academic_lead', label: 'Academic Lead' },
  { value: 'it_graphics_lead', label: 'IT/Graphics Lead' },
  { value: 'field_specialist', label: 'Field Specialist' },
  { value: 'admin', label: 'Admin (basic)' },
  { value: 'agent', label: 'Agent' },
]

export function DashboardClient({ user }: { user: User }) {
  const [tab, setTab] = useState('Overview')
  const [users, setUsers] = useState<DBUser[]>([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<Settings>({
    whatsapp: '',
    telegram: '',
    instagram: '',
    snapchat: '',
  })
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [conversations, setConversations] = useState<Convo[]>([])
  const [uploads, setUploads] = useState<UploadRow[]>([])
  const [intake, setIntake] = useState<IntakeRow[]>([])
  const [commissionPercent, setCommissionPercent] = useState('')
  const [settingsError, setSettingsError] = useState('')
  const [priceDraft, setPriceDraft] = useState<Record<number, string>>({})
  const [payingId, setPayingId] = useState<number | null>(null)
  const [staff, setStaff] = useState<{ id: number; name: string; role: string | null; field: string | null }[]>([])
  const [agentDraft, setAgentDraft] = useState<Record<number, string>>({})
  const [payError, setPayError] = useState<Record<number, string>>({})
  const [unread, setUnread] = useState(0)
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  // Load live chat + upload data from Supabase
  const loadChatData = useCallback(async () => {
    const { data: convos } = await supabase
      .from('conversations')
      .select('id, client_name, status, updated_at')
      .order('updated_at', { ascending: false })
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_type, content, read, created_at')
      .order('created_at', { ascending: false })
      .limit(1000)
    const byConvo = new Map<number, DbMsg[]>()
    ;(msgs as DbMsg[] | null)?.forEach((m) => {
      const arr = byConvo.get(m.conversation_id) || []
      arr.push(m)
      byConvo.set(m.conversation_id, arr)
    })
    let totalUnread = 0
    const list: Convo[] = (convos || []).map((c: any) => {
      const cm = byConvo.get(c.id) || []
      const last = cm[0]
      const u = cm.filter((m) => m.sender_type === 'client' && !m.read).length
      totalUnread += u
      return {
        id: c.id,
        clientName: c.client_name,
        lastMessage: last ? last.content : 'No messages yet',
        unread: u,
        time: last ? fmtTime(last.created_at) : fmtTime(c.updated_at),
      }
    })
    setConversations(list)
    setUnread(totalUnread)
    const { data: ups } = await supabase
      .from('uploads')
      .select('*')
      .order('created_at', { ascending: false })
    setUploads((ups as UploadRow[]) || [])
  }, [supabase])

  const requestNotif = useCallback(async () => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'granted') {
      setNotifEnabled(true)
      return
    }
    const perm = await Notification.requestPermission()
    setNotifEnabled(perm === 'granted')
  }, [])

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') setNotifEnabled(true)
    loadChatData()
    // Batch bursts of realtime events into one refetch.
    let timer: ReturnType<typeof setTimeout> | undefined
    const scheduleReload = () => {
      clearTimeout(timer)
      timer = setTimeout(loadChatData, 300)
    }
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'uploads' }, scheduleReload)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        scheduleReload()
        const r = payload.new as DbMsg
        if (r.sender_type === 'client' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('New client message', { body: r.content.slice(0, 120) })
        }
      })
      .subscribe()
    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [supabase, loadChatData])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isSuperAdmin = user.role === 'super_admin'
  const isLeadUser = ['academic_lead', 'it_graphics_lead', 'field_specialist'].includes(user.role || '')
  const isSubAdmin = isLeadUser || user.role === 'admin'
  
  // Navigation based on role
  const nav = isSuperAdmin
    ? ['Overview', 'User Management', 'Submissions', 'Chats', 'Leaderboard', 'Announcements', 'Settings']
    : isSubAdmin
    ? ['Overview', 'Submissions', 'Chats', 'Leaderboard', 'Announcements']
    : ['Overview', 'Chats']

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load everything in parallel instead of one request after another
        const [usersData, settingsData, intakeData] = await Promise.all([
          isSuperAdmin ? fetch('/api/admin/users').then((r) => r.json()).catch(() => []) : Promise.resolve([]),
          fetch(isSuperAdmin ? '/api/settings?scope=admin' : '/api/settings').then((r) => r.json()).catch(() => ({})),
          fetch('/api/submissions').then((r) => (r.ok ? r.json() : [])).catch(() => []),
        ])
        setUsers(Array.isArray(usersData) ? usersData : [])
        setIntake(Array.isArray(intakeData) ? intakeData : [])
        setSettings({
          whatsapp: settingsData.whatsapp || '',
          telegram: settingsData.telegram || '',
          instagram: settingsData.instagram || '',
          snapchat: settingsData.snapchat || '',
        })
        if (settingsData.commissionPercent !== undefined) setCommissionPercent(String(settingsData.commissionPercent))
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [isSuperAdmin])

  const updateUser = async (id: number, updates: Partial<DBUser>) => {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    if (res.ok) {
      const updated = await res.json()
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updated } : u))
    }
  }

  useEffect(() => {
    fetch('/api/staff').then((r) => (r.ok ? r.json() : [])).then((rows) => setStaff(Array.isArray(rows) ? rows : [])).catch(() => {})
  }, [])

  const updateBrief = async (id: number, payload: Record<string, unknown>) => {
    setPayingId(id)
    setPayError((e) => ({ ...e, [id]: '' }))
    try {
      const res = await fetch('/api/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not update the brief.')
      setIntake((rows) => rows.map((r) => (r.id === id ? { ...r, ...data, assigneeName: data.assigneeName ?? r.assigneeName } : r)))
    } catch (caught) {
      setPayError((e) => ({ ...e, [id]: caught instanceof Error ? caught.message : 'Could not update the brief.' }))
    } finally {
      setPayingId(null)
    }
  }

  const saveSettings = async () => {
    setSettingsLoading(true)
    setSettingsSaved(false)
    try {
      setSettingsError('')
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, commissionPercent: commissionPercent === '' ? undefined : Number(commissionPercent) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSettingsError(data.error || 'Could not save settings.')
        return
      }
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSettingsLoading(false)
    }
  }

  const confirmStatus = (u: DBUser, status: string, question: string) => {
    if (window.confirm(question)) updateUser(u.id, { status })
  }

  // One group per client: briefs by contact, chat files by conversation
  const briefGroups = Object.values(
    intake.reduce<Record<string, { key: string; label: string; items: IntakeRow[] }>>((acc, s) => {
      const key = (s.clientContact || '').trim().toLowerCase() || `ticket-${s.id}`
      ;(acc[key] ||= { key, label: s.clientContact?.trim() || 'No contact given', items: [] }).items.push(s)
      return acc
    }, {})
  )
  const convoName = (id: number | null) => conversations.find((c) => c.id === id)?.clientName || 'Unknown client'
  const fileGroups = Object.values(
    uploads.reduce<Record<string, { key: string; label: string; items: UploadRow[] }>>((acc, f) => {
      const key = String(f.conversation_id ?? 'none')
      ;(acc[key] ||= { key, label: `${convoName(f.conversation_id)} · Chat #${f.conversation_id ?? '—'}`, items: [] }).items.push(f)
      return acc
    }, {})
  )

  const pendingCount = users.filter(u => u.status === 'pending').length
  const activeCount = users.filter(u => u.status === 'active').length

  return (
    <main className="min-h-screen bg-[#06121d] text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -left-24 top-24 size-96 rounded-full bg-cyan-400/10 blur-[110px]" />
        <div className="absolute right-0 top-0 size-[34rem] rounded-full bg-indigo-500/15 blur-[140px]" />
      </div>

      <div className="mx-auto flex max-w-7xl gap-6 px-5 py-8 lg:px-8">
        {/* Sidebar */}
        <aside className={`${glass} hidden w-60 shrink-0 rounded-3xl p-4 lg:block`}>
          <div className="mb-8 flex items-center gap-3 px-3">
            {user.image ? (
              <img src={user.image} alt="" className="size-10 rounded-full" />
            ) : (
              <div className="size-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold">
                {user.name?.[0] || 'U'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{user.name}</p>
              <p className="text-[10px] text-cyan-300 uppercase tracking-wider">
                {user.role?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {nav.map(item => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${
                  tab === item
                    ? 'bg-cyan-300/15 text-cyan-200'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {item === 'Overview' && <BarChart3 className="size-4" />}
                {item === 'User Management' && <Users className="size-4" />}
                {item === 'Submissions' && <FileText className="size-4" />}
                {item === 'Chats' && <MessageCircle className="size-4" />}
                {item === 'Settings' && <Settings2 className="size-4" />}
                {item === 'Announcements' && <Megaphone className="size-4" />}
                {item === 'Leaderboard' && <Trophy className="size-4" />}
                {item}
                {item === 'User Management' && pendingCount > 0 && (
                  <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-8 pt-4 border-t border-white/10">
            <div className="px-3 mb-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Quick Actions</p>
            </div>
            <a
              href="/agent/chat"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <MessageCircle className="size-4" /> Chat Console
            </a>
            <a
              href="/"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <Zap className="size-4" /> View Site
            </a>
          </div>

          <button
            onClick={handleSignOut}
            className="mt-6 flex items-center gap-2 px-3 text-xs text-slate-500 hover:text-white"
          >
            <LogOut className="size-3" /> Sign out
          </button>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Mobile header */}
          <div className="lg:hidden mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user.image ? (
                <img src={user.image} alt="" className="size-8 rounded-full" />
              ) : (
                <div className="size-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  {user.name?.[0] || 'U'}
                </div>
              )}
              <span className="text-sm font-bold">{user.name}</span>
            </div>
            <button onClick={handleSignOut} className="text-slate-400 hover:text-white">
              <LogOut className="size-5" />
            </button>
          </div>

          {/* Mobile nav */}
          <div className="lg:hidden mb-6 flex gap-2 overflow-x-auto pb-2">
            {nav.map(item => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium ${
                  tab === item
                    ? 'bg-cyan-500 text-white'
                    : 'bg-white/5 text-slate-400'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">
                {isSuperAdmin ? 'Super Admin' : isSubAdmin ? 'Admin' : 'Dashboard'}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">{tab}</h1>
            </div>
            <button
              onClick={() => { requestNotif(); setTab('Chats') }}
              title={notifEnabled ? 'Notifications on — click to view chats' : 'Enable notifications'}
              className={`relative flex size-11 items-center justify-center rounded-2xl ${glass} ${notifEnabled ? 'text-cyan-300' : 'text-slate-400'} hover:text-white`}
            >
              <Bell className="size-5" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex min-w-5 h-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </button>
          </div>

          <div className="mt-6"><PushPrompt /></div>
        {(isSuperAdmin || isSubAdmin) && <SupportPresence userId={String(user.id ?? user.email)} />}

          {/* Overview Tab */}
          {tab === 'Overview' && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Active Users', activeCount, Users, 'text-emerald-400'],
                ['Pending Approval', pendingCount, Clock3, 'text-amber-400'],
                ['Active Chats', conversations.length, MessageCircle, 'text-blue-400'],
                ['Briefs', intake.length, Zap, 'text-violet-400'],
              ].map(([label, value, Icon, color]: any) => (
                <div key={label} className={`${glass} rounded-2xl p-5`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{label}</span>
                    <Icon className={`size-4 ${color}`} />
                  </div>
                  <p className="mt-4 text-2xl font-bold">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* User Management Tab (Super Admin only) */}
          {tab === 'User Management' && isSuperAdmin && (
            <div className={`${glass} mt-8 rounded-3xl p-5 sm:p-6`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-bold">All Users</h2>
                  <p className="mt-1 text-xs text-slate-500">Approve pending users and assign roles.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs">
                    {activeCount} active
                  </span>
                  {pendingCount > 0 && (
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs">
                      {pendingCount} pending
                    </span>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="size-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-center py-12 text-slate-500">No users yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="pb-3">User</th>
                        <th className="pb-3">Email</th>
                        <th className="pb-3">Role</th>
                        <th className="pb-3">Field</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-b border-white/5">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              {u.avatar ? (
                                <img src={u.avatar} alt="" className="size-8 rounded-full" />
                              ) : (
                                <div className="size-8 rounded-full bg-slate-600 flex items-center justify-center text-xs">
                                  {u.name[0]}
                                </div>
                              )}
                              <span className="font-medium">{u.name}</span>
                            </div>
                          </td>
                          <td className="py-4 text-slate-400">{u.email}</td>
                          <td className="py-4">
                            <select
                              value={u.role || ''}
                              onChange={e => updateUser(u.id, { role: e.target.value || null } as any)}
                              className="rounded-lg border border-white/10 bg-white/10 px-2 py-1.5 text-xs text-white"
                            >
                              <option value="" className="bg-slate-900">Unassigned</option>
                              {ROLES.map(r => (
                                <option key={r.value} value={r.value} className="bg-slate-900">
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-4">
                            <select
                              value={u.field || ''}
                              onChange={e => updateUser(u.id, { field: e.target.value || null })}
                              aria-label={`Field for ${u.name}`}
                              className="rounded-lg border border-white/10 bg-white/10 px-2 py-1.5 text-xs text-white"
                            >
                              <option value="" className="bg-slate-900">Unassigned</option>
                              {FIELDS.map(f => (
                                <option key={f.value} value={f.value} className="bg-slate-900">{f.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-4">
                            <span className={`rounded-full px-2 py-1 text-[11px] ${
                              u.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' :
                              u.status === 'pending' ? 'bg-amber-500/20 text-amber-300' :
                              'bg-rose-500/20 text-rose-300'
                            }`}>
                              {u.status === 'disabled' ? 'removed' : u.status}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex gap-2">
                              {u.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => updateUser(u.id, { status: 'active' })}
                                    className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/30"
                                  >
                                    <UserCheck className="size-3" /> Approve
                                  </button>
                                  <button
                                    onClick={() => confirmStatus(u, 'rejected', `Reject ${u.name}'s request?`)}
                                    className="flex items-center gap-1 rounded-lg bg-rose-500/20 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/30"
                                  >
                                    <UserX className="size-3" /> Reject
                                  </button>
                                </>
                              )}
                              {u.status === 'active' && u.role !== 'super_admin' && (
                                <button
                                  onClick={() => confirmStatus(u, 'disabled', `Remove ${u.name} from the team? They lose access immediately.`)}
                                  className="flex items-center gap-1 rounded-lg bg-rose-500/20 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/30"
                                >
                                  <UserX className="size-3" /> Remove
                                </button>
                              )}
                              {(u.status === 'disabled' || u.status === 'rejected') && (
                                <button
                                  onClick={() => updateUser(u.id, { status: 'active' })}
                                  className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/30"
                                >
                                  <Check className="size-3" /> Enable
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Submissions Tab */}
          {tab === 'Submissions' && (
            <div className={`${glass} mt-8 rounded-3xl p-5 sm:p-6`}>
              <h2 className="font-bold">Submissions &amp; Files</h2>
              <p className="mt-1 text-xs text-slate-500">Briefs from the homepage intake form, then files shared in chat. Grouped by client. Files are deleted automatically after 7 days to save space, so download them before then.</p>
              <h3 className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-slate-400">Intake briefs ({intake.length})</h3>
              {intake.length === 0 ? (
                <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-500">No briefs yet. They appear here as soon as a client submits the homepage form.</p>
              ) : (
                <div className="mt-3 flex flex-col gap-3">
                  {briefGroups.map((g) => (
                  <details key={g.key} open className="rounded-2xl border border-white/10 bg-black/10 p-3">
                    <summary className="cursor-pointer select-none text-sm font-bold text-white">
                      {g.label} <span className="ml-1 rounded-full bg-cyan-300/10 px-2 py-0.5 text-[11px] font-medium text-cyan-200">{g.items.length} brief{g.items.length === 1 ? '' : 's'}</span>
                    </summary>
                    <div className="mt-3 flex flex-col gap-3">
                  {g.items.map((s) => (
                    <div key={s.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-cyan-200">{s.ticketId}</span>
                          <span className="text-sm font-medium text-white">{s.serviceType}</span>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${s.paidAt ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{s.status || 'Pending Quote'}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {[s.scope, s.urgency, s.clientContact ? `Contact: ${s.clientContact}` : null, s.createdAt ? fmtTime(s.createdAt) : null].filter(Boolean).join(' · ')}
                      </p>
                      {s.briefDetails && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{s.briefDetails}</p>}
                      {s.fileUrls && /^https?:\/\//.test(s.fileUrls) && (
                        <a href={s.fileUrls} target="_blank" rel="noopener noreferrer" download className="mt-3 inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2 text-xs font-bold text-white hover:from-cyan-400 hover:to-blue-500">
                          <Download className="size-4" /> Download attachment
                        </a>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 text-xs">
                        <span className="text-slate-400">
                          {s.referrerName ? <>Referred by <strong className="text-cyan-200">{s.referrerName}</strong></> : 'No referral'}
                        </span>
                        {s.paidAt ? (
                          <span className="ml-auto text-emerald-300">
                            Paid · {s.assigneeName || 'Agent'} · GHS {Number(s.priceGhs).toFixed(2)} · commission GHS {Number(s.commissionGhs || 0).toFixed(2)}
                          </span>
                        ) : (
                          <span className="ml-auto flex flex-wrap items-center gap-2">
                            {s.assigneeName && (
                              <span className="text-cyan-200">Assigned: <strong>{s.assigneeName}</strong> · GHS {Number(s.priceGhs).toFixed(2)}</span>
                            )}
                            <select
                              value={agentDraft[s.id] ?? (s.assignedTo ? String(s.assignedTo) : '')}
                              onChange={(e) => setAgentDraft((d) => ({ ...d, [s.id]: e.target.value }))}
                              aria-label={`Assign ${s.ticketId} to`}
                              className="h-9 rounded-lg border border-white/10 bg-white/10 px-2 text-white"
                            >
                              <option value="" className="bg-slate-900">Assign to…</option>
                              {staff.map((a) => (
                                <option key={a.id} value={a.id} className="bg-slate-900">{a.name}{a.field ? ` · ${a.field}` : ''}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              placeholder="Price GHS"
                              value={priceDraft[s.id] ?? (s.priceGhs ? String(Number(s.priceGhs)) : '')}
                              onChange={(e) => setPriceDraft((d) => ({ ...d, [s.id]: e.target.value }))}
                              aria-label={`Job price for ${s.ticketId}`}
                              className="h-9 w-28 rounded-lg border border-white/10 bg-white/10 px-2 text-white outline-none focus:border-cyan-500/50"
                            />
                            <button
                              onClick={() => updateBrief(s.id, {
                                action: 'assign',
                                assignedTo: Number(agentDraft[s.id] ?? s.assignedTo),
                                priceGhs: Number(priceDraft[s.id] ?? s.priceGhs),
                              })}
                              disabled={payingId === s.id || !(agentDraft[s.id] ?? s.assignedTo) || !(priceDraft[s.id] ?? s.priceGhs)}
                              className="h-9 rounded-lg bg-cyan-500/20 px-3 font-bold text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50"
                            >
                              {s.assignedTo ? 'Update' : 'Assign'}
                            </button>
                            {s.assignedTo && (isSuperAdmin || isLeadUser) && (
                              <button
                                onClick={() => window.confirm(`Mark ${s.ticketId} as paid? Commission becomes earned and the job is locked.`) && updateBrief(s.id, { action: 'paid' })}
                                disabled={payingId === s.id}
                                className="h-9 rounded-lg bg-emerald-500/20 px-3 font-bold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                              >
                                Mark paid
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                      {payError[s.id] && <p role="alert" className="mt-2 text-xs text-rose-300">{payError[s.id]}</p>}
                    </div>
                  ))}
                    </div>
                  </details>
                  ))}
                </div>
              )}
              <h3 className="mt-8 text-xs font-bold uppercase tracking-[.16em] text-slate-400">Chat files ({uploads.length})</h3>
              {uploads.length === 0 ? (
                <div className="mt-6 text-center py-12 text-slate-500">
                  <FileText className="size-12 mx-auto mb-4 opacity-50" />
                  <p>No submissions yet</p>
                </div>
              ) : (
                <div className="mt-6 flex flex-col gap-3">
                  {fileGroups.map((g) => (
                  <details key={g.key} open className="rounded-2xl border border-white/10 bg-black/10 p-3">
                    <summary className="cursor-pointer select-none text-sm font-bold text-white">
                      {g.label} <span className="ml-1 rounded-full bg-cyan-300/10 px-2 py-0.5 text-[11px] font-medium text-cyan-200">{g.items.length} file{g.items.length === 1 ? '' : 's'}</span>
                    </summary>
                    <div className="mt-3 flex flex-col gap-3">
                  {g.items.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                        <FileText className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{f.file_name}</p>
                        <p className="text-[11px] text-slate-500">
                          {f.uploaded_by === 'client' ? 'Client' : 'Agent'} · Convo #{f.conversation_id ?? '—'} · {fmtSize(f.file_size)} · {fmtTime(f.created_at)}
                        </p>
                      </div>
                      <a
                        href={f.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="flex shrink-0 items-center gap-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2 text-xs font-bold text-white hover:from-cyan-400 hover:to-blue-500"
                      >
                        <Download className="size-4" /> Download
                      </a>
                    </div>
                  ))}
                    </div>
                  </details>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chats Tab */}
          {tab === 'Chats' && (
            <div className={`${glass} mt-8 rounded-3xl p-5 sm:p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold">Live Chats</h2>
                  <p className="mt-1 text-xs text-slate-500">{conversations.length} conversation{conversations.length === 1 ? '' : 's'} · {unread} unread</p>
                </div>
                <a
                  href="/agent/chat"
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-white hover:from-cyan-400 hover:to-blue-500"
                >
                  <MessageCircle className="size-4" /> Open Chat Console
                </a>
              </div>
              {conversations.length === 0 ? (
                <div className="mt-6 text-center py-12 text-slate-500">
                  <MessageCircle className="size-12 mx-auto mb-4 opacity-50" />
                  <p>No conversations yet</p>
                </div>
              ) : (
                <div className="mt-6 flex flex-col gap-2">
                  {conversations.map((c) => (
                    <a
                      key={c.id}
                      href="/agent/chat"
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-600 text-sm font-bold text-white">C</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white">{c.clientName}</span>
                          <span className="text-[10px] text-slate-500">{c.time}</span>
                        </div>
                        <p className="truncate text-xs text-slate-400">{c.lastMessage}</p>
                      </div>
                      {c.unread > 0 && (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-white">
                          {c.unread}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'Leaderboard' && <div className="mt-8"><Leaderboard /></div>}

          {/* Announcements Tab */}
          {tab === 'Announcements' && (
            <div className="mt-8"><Announcements role={user.role} field={user.field} /></div>
          )}

          {/* Settings Tab (Super Admin only) */}
          {tab === 'Settings' && isSuperAdmin && (
            <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_300px]">
              {/* Connectors */}
              <div className={`${glass} rounded-3xl p-5 sm:p-6`}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-bold">Connectors</h2>
                    <p className="mt-1 text-xs text-slate-500">Configure social media & messaging channels.</p>
                  </div>
                  {settingsError && <span role="alert" className="text-xs text-rose-300">{settingsError}</span>}
                  {settingsSaved && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <Check className="size-4" /> Saved
                    </span>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
                      <Phone className="size-4" /> WhatsApp Number
                    </label>
                    <input
                      value={settings.whatsapp}
                      onChange={e => setSettings({ ...settings, whatsapp: e.target.value })}
                      placeholder="233206478727"
                      className="w-full h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
                      <Send className="size-4" /> Telegram Handle
                    </label>
                    <input
                      value={settings.telegram}
                      onChange={e => setSettings({ ...settings, telegram: e.target.value })}
                      placeholder="@GeminiNexusAdmin"
                      className="w-full h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
                      <Camera className="size-4" /> Instagram Handle
                    </label>
                    <input
                      value={settings.instagram}
                      onChange={e => setSettings({ ...settings, instagram: e.target.value })}
                      placeholder="@GeminiNexusAdmin"
                      className="w-full h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
                      <Zap className="size-4" /> Snapchat Username
                    </label>
                    <input
                      value={settings.snapchat}
                      onChange={e => setSettings({ ...settings, snapchat: e.target.value })}
                      placeholder="GeminiNexus"
                      className="w-full h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>

                <div className="mt-6 max-w-xs">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
                    <Percent className="size-4" /> Agent commission (% of job price)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={commissionPercent}
                    onChange={e => setCommissionPercent(e.target.value)}
                    placeholder="10"
                    className="w-full h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/50"
                  />
                  <p className="mt-2 text-[11px] text-slate-500">Agents earn this % of the job price when a brief from their link is marked paid.</p>
                </div>

                <button
                  onClick={saveSettings}
                  disabled={settingsLoading}
                  className="mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-bold text-white hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
                >
                  {settingsLoading ? (
                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save Changes
                </button>
              </div>

              {/* Info Card */}
              <div className={`${glass} rounded-3xl p-5 h-fit`}>
                <ShieldCheck className="size-6 text-emerald-400" />
                <h3 className="mt-4 font-bold">Security</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  All connectors are encrypted at rest. Only super admins can modify these settings.
                </p>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-slate-500">Last updated</p>
                  <p className="text-sm text-white mt-1">Just now</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
