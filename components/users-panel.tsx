'use client'

import { Fragment, useState } from 'react'
import { Check, Trash2, UserCheck, UserX } from 'lucide-react'
import { FIELDS, fieldLabel } from '@/lib/fields'
import { ProfileCard } from '@/components/profile-card'

export type PanelUser = {
  id: number
  email: string
  name: string
  avatar: string | null
  role: string | null
  status: string
  field: string | null
  onboardedAt?: string | null
  profile?: Record<string, unknown> | null
}

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'academic_lead', label: 'Academic Lead' },
  { value: 'it_graphics_lead', label: 'IT/Graphics Lead' },
  { value: 'field_specialist', label: 'Field Specialist' },
  { value: 'admin', label: 'Admin (basic)' },
  { value: 'agent', label: 'Agent' },
]
const roleLabel = (r: string | null) => ROLES.find((x) => x.value === r)?.label ?? 'Unassigned'
const statusLabel = (s: string) => (s === 'disabled' ? 'Removed' : s.charAt(0).toUpperCase() + s.slice(1))

type GroupBy = 'field' | 'role' | 'status' | 'none'
const GROUPS: { value: GroupBy; label: string }[] = [
  { value: 'field', label: 'By skill area' },
  { value: 'role', label: 'By role' },
  { value: 'status', label: 'By status' },
  { value: 'none', label: 'No grouping' },
]

function keyOf(u: PanelUser, by: GroupBy): string {
  if (by === 'field') return fieldLabel(u.field)
  if (by === 'role') return roleLabel(u.role)
  if (by === 'status') return statusLabel(u.status)
  return 'All users'
}

type Props = {
  users: PanelUser[]
  loading: boolean
  activeCount: number
  pendingCount: number
  openProfile: number | null
  setOpenProfile: (id: number | null) => void
  onUpdate: (id: number, updates: Partial<PanelUser>) => void
  onConfirmStatus: (u: PanelUser, status: string, question: string) => void
  onDelete: (u: PanelUser) => void
}

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'
const selectCls = 'w-full rounded-lg border border-white/10 bg-white/10 px-2 py-1.5 text-xs text-white sm:w-auto'

export function UsersPanel({ users, loading, activeCount, pendingCount, openProfile, setOpenProfile, onUpdate, onConfirmStatus, onDelete }: Props) {
  const [groupBy, setGroupBy] = useState<GroupBy>('field')
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const filtered = q
    ? users.filter((u) => `${u.name} ${u.email} ${roleLabel(u.role)} ${fieldLabel(u.field)} ${u.status}`.toLowerCase().includes(q))
    : users

  // Build groups, keeping a stable, meaningful order.
  const order = groupBy === 'field'
    ? [...FIELDS.map((f) => f.label), 'Unassigned']
    : groupBy === 'role'
    ? ROLES.map((r) => r.label).concat('Unassigned')
    : groupBy === 'status'
    ? ['Pending', 'Active', 'Removed', 'Rejected']
    : ['All users']
  const map = new Map<string, PanelUser[]>()
  for (const u of filtered) {
    const k = keyOf(u, groupBy)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(u)
  }
  const groups = [...map.keys()].sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })

  return (
    <div className={`${glass} mt-8 rounded-3xl p-4 sm:p-6`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold">All Users</h2>
          <p className="mt-1 text-xs text-slate-500">Approve pending users, set roles and skill areas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300">{activeCount} active</span>
          {pendingCount > 0 && <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs text-amber-300">{pendingCount} pending</span>}
        </div>
      </div>

      {/* Search + group-by controls */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, role or skill…"
          aria-label="Search users"
          className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50 sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-white/5 p-1 text-xs">
          {GROUPS.map((g) => (
            <button key={g.value} onClick={() => setGroupBy(g.value)} className={`rounded-lg px-3 py-1.5 ${groupBy === g.value ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="size-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-500" /></div>
      ) : users.length === 0 ? (
        <p className="py-12 text-center text-slate-500">No users yet</p>
      ) : (
        <div className="mt-5 space-y-6">
          {groups.map((gname) => {
            const list = map.get(gname)!
            return (
              <div key={gname}>
                {groupBy !== 'none' && (
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="text-sm font-bold text-cyan-200">{gname}</h3>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-400">{list.length}</span>
                    <span className="h-px flex-1 bg-white/10" />
                  </div>
                )}
                <div className="space-y-2.5">
                  {list.map((u) => (
                    <Fragment key={u.id}>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                          {/* Identity */}
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            {u.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={u.avatar} alt="" className="size-9 shrink-0 rounded-full" />
                            ) : (
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-600 text-xs">{u.name[0]}</div>
                            )}
                            <div className="min-w-0">
                              <span className="block truncate font-medium">{u.name}</span>
                              <span className="block truncate text-[11px] text-slate-400">{u.email}</span>
                              {u.status === 'active' && u.role !== 'super_admin' && (
                                u.onboardedAt ? (
                                  <button onClick={() => setOpenProfile(openProfile === u.id ? null : u.id)} className="text-[11px] text-cyan-300 hover:underline">
                                    {openProfile === u.id ? 'Hide skills profile' : 'View skills profile'}
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-amber-300/80">Questionnaire not done yet</span>
                                )
                              )}
                            </div>
                          </div>

                          {/* Role + field selectors */}
                          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center lg:w-auto">
                            <select value={u.role || ''} onChange={(e) => onUpdate(u.id, { role: (e.target.value || null) as PanelUser['role'] })} aria-label={`Role for ${u.name}`} className={selectCls}>
                              <option value="" className="bg-slate-900">Unassigned role</option>
                              {ROLES.map((r) => <option key={r.value} value={r.value} className="bg-slate-900">{r.label}</option>)}
                            </select>
                            <select value={u.field || ''} onChange={(e) => onUpdate(u.id, { field: e.target.value || null })} aria-label={`Skill area for ${u.name}`} className={selectCls}>
                              <option value="" className="bg-slate-900">Unassigned skill</option>
                              {FIELDS.map((f) => <option key={f.value} value={f.value} className="bg-slate-900">{f.label}</option>)}
                            </select>
                          </div>

                          {/* Status + actions */}
                          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                            <span className={`rounded-full px-2 py-1 text-[11px] ${u.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : u.status === 'pending' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}`}>
                              {statusLabel(u.status).toLowerCase()}
                            </span>
                            {u.status === 'pending' && (
                              <>
                                <button onClick={() => onUpdate(u.id, { status: 'active' })} className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/30"><UserCheck className="size-3" /> Approve</button>
                                <button onClick={() => onConfirmStatus(u, 'rejected', `Reject ${u.name}'s request?`)} className="flex items-center gap-1 rounded-lg bg-rose-500/20 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/30"><UserX className="size-3" /> Reject</button>
                              </>
                            )}
                            {u.status === 'active' && u.role !== 'super_admin' && (
                              <button onClick={() => onConfirmStatus(u, 'disabled', `Remove ${u.name} from the team? They lose access immediately.`)} className="flex items-center gap-1 rounded-lg bg-rose-500/20 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/30"><UserX className="size-3" /> Remove</button>
                            )}
                            {(u.status === 'disabled' || u.status === 'rejected') && (
                              <button onClick={() => onUpdate(u.id, { status: 'active' })} className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/30"><Check className="size-3" /> Enable</button>
                            )}
                            {u.role !== 'super_admin' && (
                              <button onClick={() => onDelete(u)} title="Delete permanently" className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"><Trash2 className="size-3" /> Delete</button>
                            )}
                          </div>
                        </div>
                      </div>
                      {openProfile === u.id && u.profile && (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><ProfileCard profile={u.profile} /></div>
                      )}
                    </Fragment>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
