'use client'

import { Calculator, Clock3 } from 'lucide-react'

export type IntakeTask = 'Code Debugging' | 'Full Web/System Build' | 'Research Paper' | 'Slide Deck'
export type DeadlineWindow = '< 6 hours' | '24 hours' | '3+ days'

const taskOptions: IntakeTask[] = ['Code Debugging', 'Full Web/System Build', 'Research Paper', 'Slide Deck']
const deadlines: DeadlineWindow[] = ['< 6 hours', '24 hours', '3+ days']
const baseRanges: Record<IntakeTask, [number, number]> = {
  'Code Debugging': [80, 220],
  'Full Web/System Build': [350, 1200],
  'Research Paper': [120, 420],
  'Slide Deck': [100, 300],
}
const urgencyFactor: Record<DeadlineWindow, number> = { '< 6 hours': 1.5, '24 hours': 1.2, '3+ days': 1 }

export function IntakeEstimator({ task, deadline, scope, onTaskChange, onDeadlineChange }: {
  task: IntakeTask
  deadline: DeadlineWindow
  scope: number
  onTaskChange: (task: IntakeTask) => void
  onDeadlineChange: (deadline: DeadlineWindow) => void
}) {
  const [low, high] = baseRanges[task]
  const scale = Math.max(1, scope / 6) * urgencyFactor[deadline]
  const estimateLow = Math.round((low * scale) / 10) * 10
  const estimateHigh = Math.round((high * scale) / 10) * 10

  return (
    <section aria-labelledby="estimate-heading" className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/[.045] p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
        <Calculator className="size-4" />
        <h3 id="estimate-heading">Quick GHS estimate</h3>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-400">A planning range, not a binding quote. Final pricing is confirmed after specialist review.</p>
      <label htmlFor="task-kind" className="mt-4 block text-xs font-semibold text-slate-300">What do you need help with?</label>
      <select id="task-kind" value={task} onChange={(event) => onTaskChange(event.target.value as IntakeTask)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0A0F1C] px-3 text-sm text-white outline-none focus:border-cyan-300/60">
        {taskOptions.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <fieldset className="mt-4">
        <legend className="flex items-center gap-2 text-xs font-semibold text-slate-300"><Clock3 className="size-3.5" /> Deadline window</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {deadlines.map((option) => <button key={option} type="button" onClick={() => onDeadlineChange(option)} aria-pressed={deadline === option} className={`min-h-10 rounded-xl border px-2 text-xs font-semibold transition ${deadline === option ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-white/[.03] text-slate-400 hover:border-white/20'}`}>{option}</button>)}
        </div>
      </fieldset>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-2 border-t border-white/10 pt-4" aria-live="polite">
        <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Estimated range</p><p className="mt-1 text-xl font-bold tracking-tight text-white">GHS {estimateLow.toLocaleString()}–{estimateHigh.toLocaleString()}</p></div>
        <span className="text-[11px] text-slate-500">Based on current scope</span>
      </div>
    </section>
  )
}
