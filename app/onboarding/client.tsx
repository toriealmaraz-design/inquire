'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, Code2, FileText, Loader2, Palette, ShieldCheck, Sparkles } from 'lucide-react'

type Profile = Record<string, unknown>

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'
const input =
  'h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50'

const FIELD_CARDS = [
  { value: 'academic', title: 'Academic & Research', desc: 'Essays, research, reports, analysis', icon: BookOpen },
  { value: 'media', title: 'Presentations & Visuals', desc: 'Slides, design, infographics, media', icon: Palette },
  { value: 'systems', title: 'Software, IT & Hands-on', desc: 'Code, websites, databases, IT', icon: Code2 },
]

const SKILLS: Record<string, string[]> = {
  academic: ['Essays', 'Research proposals', 'Literature reviews', 'Thesis / dissertation chapters', 'Case studies', 'Lab & technical reports', 'Data analysis (SPSS/Stata/R)', 'Qualitative analysis (NVivo)', 'Editing & proofreading', 'Referencing & formatting', 'Business plans', 'CVs & personal statements'],
  media: ['Presentation slides', 'Infographics', 'Academic posters', 'Logos & branding', 'Social media graphics', 'Flyers & brochures', 'Video editing', 'Photo editing', 'UI / UX design', 'Illustration'],
  systems: ['Websites', 'Web apps', 'Mobile apps', 'Python', 'Java', 'C / C++', 'JavaScript / TypeScript', 'PHP', 'SQL & databases', 'Networking / Packet Tracer', 'Debugging & fixes', 'Excel models & dashboards', 'Data science / ML', 'IT support'],
}
const TOOLS = ['Microsoft Word', 'Excel', 'PowerPoint', 'Google Docs', 'SPSS', 'Stata', 'R', 'NVivo', 'Mendeley / Zotero', 'Canva', 'Photoshop', 'Illustrator', 'Figma', 'Premiere / CapCut', 'VS Code', 'Git / GitHub', 'MySQL / Postgres', 'WordPress', 'Cisco Packet Tracer']
const LEVELS = ['SHS', 'Diploma / HND', 'Undergraduate', 'Masters', 'PhD']
const CITATIONS = ['APA', 'MLA', 'Harvard', 'Chicago', 'IEEE', 'Vancouver', 'OSCOLA']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const EDUCATION = ['SHS', 'Diploma / HND', "Bachelor's degree", "Master's degree", 'PhD', 'Other']
const NETWORKS = ['MTN', 'Telecel', 'AirtelTigo']

const STEPS = ['About you', 'Your fields', 'Skills', 'Experience', 'Availability', 'Payout & agreement']

function Chips({ options, value, onChange, max }: { options: string[]; value: string[]; onChange: (v: string[]) => void; max?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o)
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : max && value.length >= max ? value : [...value, o])}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${on ? 'border-cyan-300/70 bg-cyan-300/15 text-cyan-100' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/30'}`}
          >
            {on && <Check className="-ml-0.5 mr-1 inline size-3" />}
            {o}
          </button>
        )
      })}
    </div>
  )
}

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <p className="mb-2 text-sm font-semibold text-slate-200">
      {children} {hint && <span className="font-normal text-slate-500">· {hint}</span>}
    </p>
  )
}

export function OnboardingClient({ name, initial, editing }: { name: string; initial: Profile | null; editing: boolean }) {
  const init = (k: string, d: unknown) => (initial && initial[k] !== undefined ? initial[k] : d)
  const [step, setStep] = useState(0)
  const [p, setP] = useState({
    phone: init('phone', '') as string,
    city: init('city', '') as string,
    education: init('education', '') as string,
    institution: init('institution', '') as string,
    programme: init('programme', '') as string,
    fields: init('fields', []) as string[],
    primaryField: init('primaryField', '') as string,
    skills: init('skills', []) as string[],
    otherSkills: init('otherSkills', '') as string,
    subjects: init('subjects', []) as string[],
    levels: init('levels', []) as string[],
    citationStyles: init('citationStyles', []) as string[],
    tools: init('tools', []) as string[],
    experienceYears: init('experienceYears', 1) as number,
    hoursPerWeek: init('hoursPerWeek', 10) as number,
    days: init('days', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) as string[],
    urgentOk: init('urgentOk', false) as boolean,
    maxJobs: init('maxJobs', 2) as number,
    portfolio: init('portfolio', '') as string,
    bio: init('bio', '') as string,
    momoNumber: init('momoNumber', '') as string,
    momoNetwork: init('momoNetwork', '') as string,
    agreeConfidential: init('agreeConfidential', false) as boolean,
  })
  const [subjectDraft, setSubjectDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = <K extends keyof typeof p>(k: K, v: (typeof p)[K]) => setP((x) => ({ ...x, [k]: v }))

  const skillOptions = useMemo(() => p.fields.flatMap((f) => SKILLS[f] || []), [p.fields])
  const academic = p.fields.includes('academic')

  // What must be filled before moving on
  const problem = (() => {
    if (step === 0 && p.phone.trim().length < 9) return 'Add a phone number the team can reach you on.'
    if (step === 0 && !p.education) return 'Choose your highest education.'
    if (step === 1 && !p.fields.length) return 'Pick at least one field.'
    if (step === 2 && p.skills.length < 2) return 'Pick at least two skills.'
    if (step === 3 && !p.levels.length) return 'Choose the levels you can work at.'
    if (step === 4 && !p.days.length) return 'Pick the days you are available.'
    if (step === 5 && !p.agreeConfidential) return 'Please accept the confidentiality agreement.'
    return ''
  })()

  const next = () => {
    if (problem) return setError(problem)
    setError('')
    if (step === 1 && (!p.primaryField || !p.fields.includes(p.primaryField))) set('primaryField', p.fields[0])
    // drop skills that no longer belong to a selected field
    if (step === 1) set('skills', p.skills.filter((s) => p.fields.some((f) => SKILLS[f]?.includes(s))))
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async () => {
    if (problem) return setError(problem)
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Could not save your answers.')
      window.location.assign('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your answers.')
      setSaving(false)
    }
  }

  const addSubject = () => {
    const s = subjectDraft.trim()
    if (s && !p.subjects.includes(s) && p.subjects.length < 20) set('subjects', [...p.subjects, s])
    setSubjectDraft('')
  }

  const pct = Math.round(((step + 1) / STEPS.length) * 100)

  return (
    <main className="min-h-screen bg-[#06121d] px-5 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-24 size-96 rounded-full bg-cyan-400/10 blur-[110px]" />
        <div className="absolute right-0 top-0 size-[34rem] rounded-full bg-indigo-500/15 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-2xl">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-cyan-300"><Sparkles className="size-3.5" /> {editing ? 'Update your profile' : "You're approved"}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{editing ? 'Your skills profile' : `Welcome to the team, ${name.split(' ')[0]}!`}</h1>
        <p className="mt-2 text-sm text-slate-400">
          Tell us what you&apos;re great at so admins can send you the right assignments. It takes about 3 minutes.
        </p>

        {/* Progress */}
        <div className="mt-6">
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Step {step + 1} of {STEPS.length} · <strong className="text-slate-300">{STEPS[step]}</strong></span>
            <span>{pct}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className={`${glass} mt-6 rounded-[2rem] p-6 sm:p-8`}>
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Phone / WhatsApp</Label><input className={input} value={p.phone} onChange={(e) => set('phone', e.target.value)} placeholder="024 000 0000" inputMode="tel" /></div>
                <div><Label hint="optional">City / town</Label><input className={input} value={p.city} onChange={(e) => set('city', e.target.value)} placeholder="Accra" /></div>
              </div>
              <div><Label>Highest education</Label><Chips options={EDUCATION} value={p.education ? [p.education] : []} onChange={(v) => set('education', v.at(-1) || '')} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label hint="optional">School / university</Label><input className={input} value={p.institution} onChange={(e) => set('institution', e.target.value)} placeholder="University of Ghana" /></div>
                <div><Label hint="optional">Programme / major</Label><input className={input} value={p.programme} onChange={(e) => set('programme', e.target.value)} placeholder="BSc Computer Science" /></div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <Label hint="pick all that apply">Which fields do you work in?</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {FIELD_CARDS.map(({ value, title, desc, icon: Icon }) => {
                  const on = p.fields.includes(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set('fields', on ? p.fields.filter((f) => f !== value) : [...p.fields, value])}
                      className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${on ? 'border-cyan-300/70 bg-cyan-300/10 ring-1 ring-cyan-300/40' : 'border-white/10 bg-white/[0.03]'}`}
                    >
                      <Icon className="size-5 text-cyan-300" />
                      <p className="mt-3 text-sm font-semibold">{title}</p>
                      <p className="mt-1 text-xs text-slate-400">{desc}</p>
                      {on && <p className="mt-3 flex items-center gap-1 text-[11px] font-bold text-cyan-300"><Check className="size-3" /> Selected</p>}
                    </button>
                  )
                })}
              </div>
              {p.fields.length > 1 && (
                <div className="mt-6">
                  <Label>Which is your main field?</Label>
                  <Chips
                    options={p.fields.map((f) => FIELD_CARDS.find((c) => c.value === f)!.title)}
                    value={p.primaryField ? [FIELD_CARDS.find((c) => c.value === p.primaryField)?.title || ''] : []}
                    onChange={(v) => set('primaryField', FIELD_CARDS.find((c) => c.title === v.at(-1))?.value || '')}
                  />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-6">
              {p.fields.map((f) => (
                <div key={f}>
                  <Label hint="pick everything you can do well">{FIELD_CARDS.find((c) => c.value === f)?.title}</Label>
                  <Chips options={SKILLS[f]} value={p.skills} onChange={(v) => set('skills', v)} />
                </div>
              ))}
              <div>
                <Label hint="optional">Anything else?</Label>
                <input className={input} value={p.otherSkills} onChange={(e) => set('otherSkills', e.target.value)} placeholder="e.g. French translation, AutoCAD, accounting" />
              </div>
              <p className="text-[11px] text-slate-500">{p.skills.length} of {skillOptions.length} skills selected</p>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-6">
              <div>
                <Label>Years of experience</Label>
                <div className="flex items-center gap-4">
                  <input type="range" min={0} max={15} value={p.experienceYears} onChange={(e) => set('experienceYears', Number(e.target.value))} className="flex-1 accent-cyan-400" aria-label="Years of experience" />
                  <span className="w-20 rounded-lg bg-cyan-300/10 px-2.5 py-1 text-center text-xs font-bold text-cyan-200">{p.experienceYears === 15 ? '15+' : p.experienceYears} yr{p.experienceYears === 1 ? '' : 's'}</span>
                </div>
              </div>
              <div><Label>Levels you can work at</Label><Chips options={LEVELS} value={p.levels} onChange={(v) => set('levels', v)} /></div>
              {academic && <div><Label hint="optional">Citation styles you know</Label><Chips options={CITATIONS} value={p.citationStyles} onChange={(v) => set('citationStyles', v)} /></div>}
              <div><Label hint="optional">Tools you use</Label><Chips options={TOOLS} value={p.tools} onChange={(v) => set('tools', v)} /></div>
              <div>
                <Label hint="optional, press Enter to add">Subjects you&apos;re strongest in</Label>
                <div className="flex gap-2">
                  <input className={input} value={subjectDraft} onChange={(e) => setSubjectDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubject())} placeholder="e.g. Economics, Nursing, Marketing" />
                  <button type="button" onClick={addSubject} className="rounded-xl border border-white/15 px-4 text-sm hover:border-cyan-300/50">Add</button>
                </div>
                {p.subjects.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.subjects.map((s) => (
                      <button key={s} type="button" onClick={() => set('subjects', p.subjects.filter((x) => x !== s))} className="rounded-full bg-indigo-400/15 px-3 py-1 text-xs text-indigo-100 hover:bg-rose-500/20" title="Remove">
                        {s} ✕
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-6">
              <div>
                <Label>Hours you can give per week</Label>
                <div className="flex items-center gap-4">
                  <input type="range" min={2} max={60} step={2} value={p.hoursPerWeek} onChange={(e) => set('hoursPerWeek', Number(e.target.value))} className="flex-1 accent-cyan-400" aria-label="Hours per week" />
                  <span className="w-20 rounded-lg bg-cyan-300/10 px-2.5 py-1 text-center text-xs font-bold text-cyan-200">{p.hoursPerWeek} h/wk</span>
                </div>
              </div>
              <div><Label>Days you&apos;re usually available</Label><Chips options={DAYS} value={p.days} onChange={(v) => set('days', v)} /></div>
              <div>
                <Label>How many jobs can you handle at once?</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 5, 8].map((n) => (
                    <button key={n} type="button" onClick={() => set('maxJobs', n)} className={`h-11 w-14 rounded-xl border text-sm font-bold ${p.maxJobs === n ? 'border-cyan-300/70 bg-cyan-300/15 text-cyan-100' : 'border-white/10 text-slate-300'}`}>
                      {n === 8 ? '8+' : n}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <input type="checkbox" checked={p.urgentOk} onChange={(e) => set('urgentOk', e.target.checked)} className="mt-0.5 size-4 accent-cyan-500" />
                <span><span className="block text-sm font-semibold">I can take urgent jobs</span><span className="text-xs text-slate-400">Work due in under 24 hours (usually pays more).</span></span>
              </label>
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col gap-5">
              <div><Label hint="optional">Portfolio or work samples link</Label><input className={input} value={p.portfolio} onChange={(e) => set('portfolio', e.target.value)} placeholder="Google Drive, GitHub, Behance…" /></div>
              <div>
                <Label hint="optional">Short bio</Label>
                <textarea value={p.bio} onChange={(e) => set('bio', e.target.value)} rows={3} maxLength={800} placeholder="What kind of work do you enjoy and do best?" className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50" />
              </div>
              <div>
                <Label hint="for commission payouts">Mobile Money</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input className={input} value={p.momoNumber} onChange={(e) => set('momoNumber', e.target.value)} placeholder="MoMo number" inputMode="tel" />
                  <div className="flex gap-2">
                    {NETWORKS.map((n) => (
                      <button key={n} type="button" onClick={() => set('momoNetwork', n)} className={`h-11 rounded-xl border px-3 text-xs font-semibold ${p.momoNetwork === n ? 'border-cyan-300/70 bg-cyan-300/15 text-cyan-100' : 'border-white/10 text-slate-300'}`}>{n}</button>
                    ))}
                  </div>
                </div>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4">
                <input type="checkbox" checked={p.agreeConfidential} onChange={(e) => set('agreeConfidential', e.target.checked)} className="mt-0.5 size-4 accent-emerald-500" />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck className="size-4 text-emerald-300" /> Confidentiality agreement</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">I'll keep all client work and information private, deliver original work, and never contact clients outside Gemini Nexus.</span>
                </span>
              </label>

              <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-xs text-slate-400">
                <p className="mb-2 flex items-center gap-1.5 font-semibold text-slate-200"><FileText className="size-3.5" /> Summary</p>
                <p>{p.fields.map((f) => FIELD_CARDS.find((c) => c.value === f)?.title).join(', ') || '—'}</p>
                <p className="mt-1">{p.skills.length} skills · {p.levels.join(', ') || 'no levels'} · {p.experienceYears} yrs · {p.hoursPerWeek} h/week · up to {p.maxJobs} jobs{p.urgentOk ? ' · urgent OK' : ''}</p>
              </div>
            </div>
          )}

          {error && <p role="alert" className="mt-5 rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button type="button" onClick={() => { setError(''); setStep((s) => Math.max(0, s - 1)) }} disabled={step === 0} className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-slate-400 hover:text-white disabled:opacity-0">
              <ArrowLeft className="size-4" /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={next} className="flex items-center gap-2 rounded-xl bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200">
                Continue <ArrowRight className="size-4" />
              </button>
            ) : (
              <button type="button" onClick={submit} disabled={saving} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-3 text-sm font-bold text-slate-950 hover:from-cyan-300 hover:to-blue-400 disabled:opacity-60">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} {editing ? 'Save profile' : 'Finish & go to my dashboard'}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
