'use client'

import { Fragment, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PushPrompt } from '@/components/push-prompt'
import { NotificationBell } from '@/components/notification-bell'
import { SupportPresence } from '@/components/support-presence'
import { Announcements } from '@/components/announcements'
import { Leaderboard } from '@/components/leaderboard'
import { ChatbotSettings } from '@/components/chatbot-settings'
  import { AssetManager } from '@/components/asset-manager'
import { RoleWatcher } from '@/components/role-watcher'
import { ProfileCard } from '@/components/profile-card'
import { AnalyticsBoard } from '@/components/analytics-board'
import { BriefEditor } from '@/components/brief-editor'
import { ComplaintsInbox } from '@/components/complaints'
import { ContactSuperAdmin } from '@/components/contact-super-admin'
import { superDelete } from '@/lib/admin-delete'
import { FIELDS, briefTitle } from '@/lib/fields'
import {
  BarChart3,
  Check,
  LogOut,
  MessageCircle,
  Settings2,
  Users,
  Zap,
  UserCheck,
  UserX,
  Save,
  ShieldCheck,
  FileText,
  BookOpen,
  Download,
  Trash2,
  Pencil,
  ChevronDown,
  Megaphone,
  Trophy,
  MessageSquareWarning,
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
  onboardedAt?: string | null
  profile?: Record<string, unknown> | null
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
  title: string | null
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
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    if (t) setTab(t)
  }, [])
  const [users, setUsers] = useState<DBUser[]>([])
  const [loading, setLoading] = useState(true)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [conversations, setConversations] = useState<Convo[]>([])
  const [uploads, setUploads] = useState<UploadRow[]>([])
  const [intake, setIntake] = useState<IntakeRow[]>([])
  const [commissionPercent, setCommissionPercent] = useState('')
  const [handles, setHandles] = useState({ whatsapp: '', telegram: '', instagram: '', snapchat: '', email: '' })
  const [settingsError, setSettingsError] = useState('')
  const [priceDraft, setPriceDraft] = useState<Record<number, string>>({})
  const [payingId, setPayingId] = useState<number | null>(null)
  const [staff, setStaff] = useState<{ id: number; name: string; role: string | null; field: string | null }[]>([])
  const [agentDraft, setAgentDraft] = useState<Record<number, string>>({})
  const [subSearch, setSubSearch] = useState('')
  const [openProfile, setOpenProfile] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [subFilter, setSubFilter] = useState<'all' | 'open' | 'assigned' | 'paid'>('all')
  const [payError, setPayError] = useState<Record<number, string>>({})
  const [unread, setUnread] = useState(0)
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


  useEffect(() => {
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
    ? ['Overview', 'User Management', 'Submissions', 'Chats', 'Complaints', 'Leaderboard', 'Announcements', 'Settings']
    : isSubAdmin
    ? ['Overview', 'Submissions', 'Chats', 'Complaints', 'Leaderboard', 'Announcements']
    : ['Overview', 'Chats']

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load everything in parallel instead of one request after another
        const [usersData, settingsData, intakeData] = await Promise.all([
          isSuperAdmin ? fetch('/api/admin/users').then((r) => r.json()).catch(() => []) : Promise.resolve([]),
          isSuperAdmin ? fetch('/api/settings?scope=admin').then((r) => r.json()).catch(() => ({})) : Promise.resolve({}),
          fetch('/api/submissions').then((r) => (r.ok ? r.json() : [])).catch(() => []),
        ])
        setUsers(Array.isArray(usersData) ? usersData : [])
        setIntake(Array.isArray(intakeData) ? intakeData : [])
        if (settingsData.commissionPercent !== undefined) setCommissionPercent(String(settingsData.commissionPercent))
        if (isSuperAdmin) setHandles({ whatsapp: settingsData.whatsapp || '', telegram: settingsData.telegram || '', instagram: settingsData.instagram || '', snapchat: settingsData.snapchat || '', email: settingsData.email || '' })
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
        body: JSON.stringify({ ...handles, commissionPercent: commissionPercent === '' ? undefined : Number(commissionPercent) }),
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

  // ---- Client folders: every brief + chat file for one client, together ----
  // Contacts are normalised so "024 000 0000", "+233 24 000 0000" and "@Handle" match their variants.
  const clientKey = (raw: string | null | undefined) => {
    const v = (raw || '').trim().toLowerCase()
    if (!v) return ''
    const digits = v.replace(/\D/g, '')
    return digits.length >= 9 && digits.length >= v.replace(/[\s+()-]/g, '').length - 1 ? `tel:${digits.slice(-9)}` : v.replace(/^@/, '')
  }
  type ClientFolder = { key: string; name: string; contact: string; briefs: IntakeRow[]; files: UploadRow[]; last: number }
  const folders = (() => {
    const map = new Map<string, ClientFolder>()
    const get = (key: string, name: string, contact: string) => {
      let f = map.get(key)
      if (!f) map.set(key, (f = { key, name, contact, briefs: [], files: [], last: 0 }))
      if (!f.name && name) f.name = name
      return f
    }
    for (const s of intake) {
      const key = clientKey(s.clientContact) || `ticket-${s.id}`
      const f = get(key, '', s.clientContact?.trim() || '')
      f.briefs.push(s)
      f.last = Math.max(f.last, s.createdAt ? Date.parse(s.createdAt) : 0)
    }
    for (const u of uploads) {
      const convo = conversations.find((c) => c.id === u.conversation_id)
      const label = convo?.clientName || `Chat #${u.conversation_id ?? '—'}`
      const m = label.match(/^(.*?)\s*\(([^)]+)\)\s*$/) // "Name (contact)" from the chat page
      const name = (m ? m[1] : label).trim()
      const contact = m ? m[2].trim() : ''
      const key = clientKey(contact) || `chat-${u.conversation_id ?? 'none'}`
      const f = get(key, name, contact)
      f.files.push(u)
      f.last = Math.max(f.last, Date.parse(u.created_at))
    }
    return [...map.values()].sort((a, b) => b.last - a.last)
  })()
  const visibleFolders = folders
    .map((f) => ({
      ...f,
      briefs: f.briefs.filter((s) =>
        subFilter === 'open' ? !s.assignedTo && !s.paidAt : subFilter === 'assigned' ? !!s.assignedTo && !s.paidAt : subFilter === 'paid' ? !!s.paidAt : true
      ),
    }))
    .filter((f) => (subFilter === 'all' || f.briefs.length > 0))
    .filter((f) => {
      const q = subSearch.trim().toLowerCase()
      if (!q) return true
      return [f.name, f.contact, ...f.briefs.map((s) => `${s.ticketId} ${briefTitle(s)} ${s.serviceType} ${s.briefDetails || ''}`), ...f.files.map((x) => x.file_name)]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })

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
                {item === 'Complaints' && <MessageSquareWarning className="size-4" />}
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
            <div className="flex items-center gap-2">
              <a href="/help" className="flex h-11 items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.075] px-4 text-xs font-semibold text-slate-300 backdrop-blur-2xl hover:text-white">
                <BookOpen className="size-4" /> Help
              </a>
              <NotificationBell />
            </div>
          </div>

          <div className="mt-6"><PushPrompt showTest /></div>
        <RoleWatcher role={user.role} status={user.status} field={user.field} />
        {(isSuperAdmin || isSubAdmin) && <SupportPresence userId={String(user.id ?? user.email)} />}

          {/* Overview Tab: analytics */}
          {tab === 'Overview' && <AnalyticsBoard onNavigate={(t) => nav.includes(t) && setTab(t)} />}

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
                        <Fragment key={u.id}>
                        <tr className="border-b border-white/5">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              {u.avatar ? (
                                <img src={u.avatar} alt="" className="size-8 rounded-full" />
                              ) : (
                                <div className="size-8 rounded-full bg-slate-600 flex items-center justify-center text-xs">
                                  {u.name[0]}
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="block font-medium">{u.name}</span>
                                {u.status === 'active' && u.role !== 'super_admin' && (
                                  u.onboardedAt ? (
                                    <button onClick={() => setOpenProfile(openProfile === u.id ? null : u.id)} className="text-[11px] text-cyan-300 hover:underline">
                                      {openProfile === u.id ? 'Hide profile' : 'View skills profile'}
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-amber-300/80">Questionnaire not done yet</span>
                                  )
                                )}
                              </div>
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
                              {u.role !== 'super_admin' && (
                                <button
                                  onClick={async () => { if (await superDelete('user', [u.id], `Permanently delete ${u.name} (${u.email})? Their briefs stay but are unassigned. If they sign in again they'll start as a new pending account.`)) setUsers((rows) => rows.filter((r) => r.id !== u.id)) }}
                                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"
                                  title="Delete permanently"
                                ><Trash2 className="size-3" /> Delete</button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {openProfile === u.id && u.profile && (
                          <tr className="border-b border-white/5 bg-white/[0.03]">
                            <td colSpan={6} className="p-4"><ProfileCard profile={u.profile} /></td>
                          </tr>
                        )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Submissions Tab */}
          {tab === 'Submissions' && (
            <div className="mt-8 flex flex-col gap-4">
              <div className={`${glass} rounded-3xl p-5 sm:p-6`}>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="font-bold">Clients &amp; assignments</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      One folder per client with all their briefs and files. Files are deleted automatically after 7 days, so download them before then.
                    </p>
                  </div>
                  <div className="flex gap-2 text-center text-[11px] text-slate-400">
                    {[
                      ['Clients', folders.length],
                      ['Open', intake.filter((s) => !s.assignedTo && !s.paidAt).length],
                      ['Assigned', intake.filter((s) => s.assignedTo && !s.paidAt).length],
                      ['Paid', intake.filter((s) => s.paidAt).length],
                    ].map(([label, n]) => (
                      <span key={label as string} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"><strong className="block text-base text-white">{n}</strong>{label}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                    placeholder="Search client, contact, ticket, file…"
                    aria-label="Search clients"
                    className="h-10 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
                  />
                  <div className="flex rounded-xl bg-white/5 p-1 text-xs">
                    {(['all', 'open', 'assigned', 'paid'] as const).map((f) => (
                      <button key={f} onClick={() => setSubFilter(f)} className={`rounded-lg px-3 py-1.5 capitalize ${subFilter === f ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {visibleFolders.length === 0 ? (
                <div className={`${glass} rounded-3xl p-10 text-center text-sm text-slate-500`}>
                  <FileText className="mx-auto mb-3 size-10 opacity-50" />
                  {folders.length === 0 ? 'No clients yet. Briefs and chat files appear here automatically.' : 'Nothing matches this filter.'}
                </div>
              ) : (
                visibleFolders.map((g) => {
                  const openJobs = g.briefs.filter((s) => !s.paidAt).length
                  const value = g.briefs.reduce((t, s) => t + Number(s.priceGhs || 0), 0)
                  const title = g.name || g.contact || 'Unnamed client'
                  return (
                    <details key={g.key} open={openJobs > 0 || !!subSearch} className={`${glass} group rounded-3xl`}>
                      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4 sm:p-5">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/30 to-indigo-500/30 text-sm font-bold text-cyan-100">
                          {title.replace(/^[^a-z0-9]+/i, '').charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-white">{title}</p>
                          <p className="truncate text-xs text-slate-400">{g.contact && g.contact !== title ? g.contact : g.name ? '' : 'No contact given'}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          <span className="rounded-full bg-cyan-300/10 px-2 py-0.5 text-cyan-200">{g.briefs.length} brief{g.briefs.length === 1 ? '' : 's'}</span>
                          <span className="rounded-full bg-violet-300/10 px-2 py-0.5 text-violet-200">{g.files.length} file{g.files.length === 1 ? '' : 's'}</span>
                          {openJobs > 0 && <span className="rounded-full bg-amber-300/10 px-2 py-0.5 text-amber-200">{openJobs} active</span>}
                          {value > 0 && <span className="rounded-full bg-emerald-300/10 px-2 py-0.5 text-emerald-200">GHS {value.toFixed(0)}</span>}
                        </div>
                        {isSuperAdmin && (
                          <button
                            onClick={async (e) => {
                              e.preventDefault()
                              const label = g.name || g.contact || 'this client'
                              const ok = await superDelete('brief', g.briefs.map((b) => b.id), `Delete ALL ${g.briefs.length} brief(s) and ${g.files.length} file(s) for ${label}?`)
                              if (!ok) return
                              if (g.files.length) {
                                const res = await fetch('/api/admin/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'upload', ids: g.files.map((x) => x.id) }) })
                                const d = await res.json().catch(() => ({}))
                                if (d.files?.length) await createClient().storage.from('uploads').remove(d.files)
                              }
                              setIntake((rows) => rows.filter((r) => !g.briefs.some((b) => b.id === r.id)))
                              setUploads((rows) => rows.filter((r) => !g.files.some((x) => x.id === r.id)))
                            }}
                            title="Delete all of this client's briefs and files" aria-label="Delete client data"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"
                          ><Trash2 className="size-4" /></button>
                        )}
                        <ChevronDown className="size-4 text-slate-500 transition group-open:rotate-180" />
                      </summary>

                      <div className="flex flex-col gap-4 border-t border-white/10 p-4 sm:p-5">
                        {g.briefs.length > 0 && (
                          <div>
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-slate-500">Briefs</p>
                            <div className="flex flex-col gap-3">
                              {g.briefs.map((s) => (
                    <div key={s.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                            <span className="truncate">{briefTitle(s)}</span>
                            <button
                              onClick={() => {
                                const t = window.prompt('Brief title', s.title || briefTitle(s))
                                if (t && t.trim()) updateBrief(s.id, { action: 'rename', title: t })
                              }}
                              aria-label={`Rename ${s.ticketId}`}
                              title="Rename"
                              className="shrink-0 rounded p-0.5 text-slate-500 hover:text-cyan-300"
                            >
                              <Pencil className="size-3" />
                            </button>
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500"><span className="font-mono text-cyan-300/80">{s.ticketId}</span> · {s.serviceType}</p>
                        </div>
                        <span className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] ${s.paidAt ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{s.status || 'Pending Quote'}</span>
                          {isSuperAdmin && (
                            <>
                              <button onClick={() => setEditing(editing === s.id ? null : s.id)} title="Edit everything" aria-label={`Edit ${s.ticketId}`} className="rounded-lg border border-white/10 px-2 py-0.5 text-[11px] text-slate-300 hover:border-cyan-300/50 hover:text-cyan-200">Edit</button>
                              <button
                                onClick={async () => { if (await superDelete('brief', [s.id], `Delete brief ${s.ticketId} "${briefTitle(s)}" and its attachment?`)) setIntake((rows) => rows.filter((r) => r.id !== s.id)) }}
                                title="Delete brief" aria-label={`Delete ${s.ticketId}`} className="shrink-0 rounded p-0.5 text-slate-500 hover:text-rose-300"
                              ><Trash2 className="size-3.5" /></button>
                            </>
                          )}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {[s.scope, s.urgency, s.createdAt ? fmtTime(s.createdAt) : null].filter(Boolean).join(' · ')}
                      </p>
                      {editing === s.id && (
                        <BriefEditor brief={s} onClose={() => setEditing(null)} onSaved={(d) => setIntake((rows) => rows.map((r) => (r.id === s.id ? { ...r, ...(d as Partial<IntakeRow>) } : r)))} />
                      )}
                      {s.briefDetails && <details className="mt-2 text-sm text-slate-300"><summary className="cursor-pointer select-none text-xs text-cyan-300 hover:text-cyan-200">Read brief</summary><p className="mt-2 whitespace-pre-wrap leading-6">{s.briefDetails}</p></details>}
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
                          </div>
                        )}
                        {g.files.length > 0 && (
                          <div>
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-slate-500">Chat files</p>
                            <div className="flex flex-col gap-2">
                              {g.files.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                        <FileText className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{f.file_name}</p>
                        <p className="text-[11px] text-slate-500">
                          {f.uploaded_by === 'client' ? 'From client' : 'From staff'} · {fmtSize(f.file_size)} · {fmtTime(f.created_at)}
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
                      {isSuperAdmin && (
                        <button
                          onClick={async () => { if (await superDelete('upload', [f.id], `Delete the file "${f.file_name}"?`)) setUploads((rows) => rows.filter((r) => r.id !== f.id)) }}
                          title="Delete file" aria-label={`Delete ${f.file_name}`} className="shrink-0 rounded p-0.5 text-slate-500 hover:text-rose-300"
                        ><Trash2 className="size-4" /></button>
                      )}
                    </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  )
                })
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
                      {isSuperAdmin && (
                        <button
                          onClick={async (e) => {
                            e.preventDefault()
                            if (await superDelete('conversation', [c.id], `Delete the whole conversation with ${c.clientName}, including all messages and files?`)) {
                              setConversations((rows) => rows.filter((r) => r.id !== c.id))
                              setUploads((rows) => rows.filter((r) => r.conversation_id !== c.id))
                            }
                          }}
                          title="Delete conversation"
                          aria-label={`Delete conversation with ${c.clientName}`}
                          className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'Leaderboard' && <div className="mt-8"><Leaderboard /></div>}

          {tab === 'Complaints' && (
            <div className="mt-8 flex flex-col gap-5">
              {!isSuperAdmin && <ContactSuperAdmin />}
              <ComplaintsInbox isSuperAdmin={isSuperAdmin} />
              <a href="/complaints" className="text-xs text-cyan-300 hover:underline">Need to raise a complaint yourself? Open the complaint form →</a>
            </div>
          )}

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
                    <h2 className="font-bold">Commission</h2>
                    <p className="mt-1 text-xs text-slate-500">Applies to every job price set when assigning.</p>
                  </div>
                  {settingsError && <span role="alert" className="text-xs text-rose-300">{settingsError}</span>}
                  {settingsSaved && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <Check className="size-4" /> Saved
                    </span>
                  )}
                </div>

                <div className="max-w-xs">
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

                <div className="mt-8 border-t border-white/10 pt-6">
                  <h3 className="font-semibold">Your contact handles</h3>
                  <p className="mt-1 text-xs text-slate-500">Shown to admins (never to clients or agents) so they can reach you directly.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {([
                      ['whatsapp', 'WhatsApp number', '233206478727'],
                      ['telegram', 'Telegram username', 'GeminiNexusAdmin'],
                      ['instagram', 'Instagram username', 'yourhandle'],
                      ['snapchat', 'Snapchat username', 'yourhandle'],
                      ['email', 'Email', 'you@gmail.com'],
                    ] as const).map(([k, label, ph]) => (
                      <label key={k} className="text-xs text-slate-400">
                        {label}
                        <input
                          value={handles[k]}
                          onChange={(e) => setHandles((h) => ({ ...h, [k]: e.target.value }))}
                          placeholder={ph}
                          className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <AssetManager />

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

              <div className="xl:col-start-1"><ChatbotSettings /></div>

              {/* Info Card */}
              <div className={`${glass} rounded-3xl p-5 h-fit xl:row-span-2`}>
                <ShieldCheck className="size-6 text-emerald-400" />
                <h3 className="mt-4 font-bold">Security</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Only the super admin can change commission and chatbot settings. Clients reach you through Live Chat and the homepage assistant.
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
