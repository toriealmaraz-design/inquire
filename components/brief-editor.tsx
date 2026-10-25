'use client'

import { useState } from 'react'
import { Save, X } from 'lucide-react'

type Brief = {
  id: number
  title: string | null
  briefDetails: string | null
  clientContact: string | null
  scope: string | null
  urgency: string | null
  status: string | null
  priceGhs: string | null
  paidAt: string | null
}

const field = 'w-full rounded-lg border border-white/10 bg-white/10 px-3 text-sm text-white outline-none focus:border-cyan-500/50'
const STATUSES = ['Pending Quote', 'Quoted', 'Assigned', 'In Progress', 'Delivered', 'Paid', 'Cancelled']

/** Super admin: edit every detail of a brief, including after it is paid */
export function BriefEditor({ brief, onSaved, onClose }: { brief: Brief; onSaved: (b: Record<string, unknown>) => void; onClose: () => void }) {
  const [f, setF] = useState({
    title: brief.title || '',
    clientContact: brief.clientContact || '',
    scope: brief.scope || '',
    urgency: brief.urgency || '',
    status: brief.status || 'Pending Quote',
    priceGhs: brief.priceGhs ? String(Number(brief.priceGhs)) : '',
    briefDetails: brief.briefDetails || '',
    unpay: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }))

  const save = async () => {
    setSaving(true)
    setError('')
    const res = await fetch('/api/submissions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: brief.id, action: 'edit', fields: f }) })
    const d = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) return setError(d.error || 'Could not save.')
    onSaved(d)
    onClose()
  }

  return (
    <div className="mt-3 rounded-2xl border border-cyan-300/30 bg-cyan-300/[0.04] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[11px] text-slate-400 sm:col-span-2">Title<input className={`${field} mt-1 h-9`} value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={120} /></label>
        <label className="text-[11px] text-slate-400">Client contact<input className={`${field} mt-1 h-9`} value={f.clientContact} onChange={(e) => set('clientContact', e.target.value)} maxLength={50} /></label>
        <label className="text-[11px] text-slate-400">Status
          <select className={`${field} mt-1 h-9`} value={f.status} onChange={(e) => set('status', e.target.value)}>
            {[...new Set([f.status, ...STATUSES])].map((s) => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
          </select>
        </label>
        <label className="text-[11px] text-slate-400">Scope<input className={`${field} mt-1 h-9`} value={f.scope} onChange={(e) => set('scope', e.target.value)} maxLength={50} /></label>
        <label className="text-[11px] text-slate-400">Urgency<input className={`${field} mt-1 h-9`} value={f.urgency} onChange={(e) => set('urgency', e.target.value)} maxLength={50} /></label>
        <label className="text-[11px] text-slate-400">Price (GHS)<input type="number" min="0" step="0.01" className={`${field} mt-1 h-9`} value={f.priceGhs} onChange={(e) => set('priceGhs', e.target.value)} /></label>
        {brief.paidAt && (
          <label className="flex items-center gap-2 self-end pb-2 text-xs text-amber-200">
            <input type="checkbox" checked={f.unpay} onChange={(e) => set('unpay', e.target.checked)} className="accent-amber-400" /> Mark as NOT paid (unlocks the job)
          </label>
        )}
        <label className="text-[11px] text-slate-400 sm:col-span-2">Brief<textarea className={`${field} mt-1 py-2`} rows={4} value={f.briefDetails} onChange={(e) => set('briefDetails', e.target.value)} maxLength={4000} /></label>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-rose-300">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"><Save className="size-3.5" /> {saving ? 'Saving…' : 'Save changes'}</button>
        <button onClick={onClose} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-slate-400 hover:text-white"><X className="size-3.5" /> Cancel</button>
      </div>
    </div>
  )
}
