import { fieldLabel } from '@/lib/fields'

type P = Record<string, unknown>
const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : [])
const txt = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null)

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">{label}</p>
      <div className="mt-1 text-sm text-slate-200">{children}</div>
    </div>
  )
}

function Tags({ items, tone = 'bg-cyan-300/10 text-cyan-100' }: { items: string[]; tone?: string }) {
  if (!items.length) return <span className="text-slate-500">—</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span key={i} className={`rounded-full px-2 py-0.5 text-[11px] ${tone}`}>{i}</span>
      ))}
    </div>
  )
}

/** Read-only view of a staff member's onboarding questionnaire */
export function ProfileCard({ profile }: { profile: P }) {
  const fields = arr(profile.fields)
  const exp = typeof profile.experienceYears === 'number' ? profile.experienceYears : null
  return (
    <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:grid-cols-2 lg:grid-cols-3">
      <Row label="Contact">{txt(profile.phone) || '—'}{txt(profile.city) ? ` · ${profile.city}` : ''}</Row>
      <Row label="Education">{[txt(profile.education), txt(profile.programme), txt(profile.institution)].filter(Boolean).join(' · ') || '—'}</Row>
      <Row label="Fields">
        {fields.map((f) => fieldLabel(f) + (f === profile.primaryField ? ' (main)' : '')).join(', ') || '—'}
      </Row>
      <div className="sm:col-span-2 lg:col-span-3"><Row label="Skills"><Tags items={arr(profile.skills)} />{txt(profile.otherSkills) && <p className="mt-1 text-xs text-slate-400">Also: {String(profile.otherSkills)}</p>}</Row></div>
      <Row label="Levels"><Tags items={arr(profile.levels)} tone="bg-indigo-300/10 text-indigo-100" /></Row>
      <Row label="Citation styles"><Tags items={arr(profile.citationStyles)} tone="bg-indigo-300/10 text-indigo-100" /></Row>
      <Row label="Subjects"><Tags items={arr(profile.subjects)} tone="bg-indigo-300/10 text-indigo-100" /></Row>
      <div className="sm:col-span-2 lg:col-span-3"><Row label="Tools"><Tags items={arr(profile.tools)} tone="bg-white/10 text-slate-200" /></Row></div>
      <Row label="Experience">{exp === null ? '—' : `${exp}${exp >= 15 ? '+' : ''} year${exp === 1 ? '' : 's'}`}</Row>
      <Row label="Availability">
        {String(profile.hoursPerWeek ?? '—')} h/week · {arr(profile.days).join(', ') || '—'}
        <br />
        <span className="text-xs text-slate-400">Up to {String(profile.maxJobs ?? '—')} jobs at once{profile.urgentOk ? ' · takes urgent jobs' : ''}</span>
      </Row>
      <Row label="MoMo payout">{txt(profile.momoNumber) ? `${profile.momoNumber}${txt(profile.momoNetwork) ? ` (${profile.momoNetwork})` : ''}` : '—'}</Row>
      {txt(profile.portfolio) && (
        <Row label="Portfolio">
          <a href={/^https?:\/\//.test(String(profile.portfolio)) ? String(profile.portfolio) : `https://${profile.portfolio}`} target="_blank" rel="noopener noreferrer" className="break-all text-cyan-300 hover:underline">{String(profile.portfolio)}</a>
        </Row>
      )}
      {txt(profile.bio) && <div className="sm:col-span-2 lg:col-span-3"><Row label="Bio"><p className="whitespace-pre-wrap text-slate-300">{String(profile.bio)}</p></Row></div>}
    </div>
  )
}
