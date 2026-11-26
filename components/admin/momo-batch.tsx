'use client'

import { useState } from 'react'
import { Download, WalletCards } from 'lucide-react'
import { AnimatedHeading } from '@/components/visual/animated-heading'

type BatchRow = { agent: string; subAgent: string; momoNumber: string; amountGhs: number }
type Batch = { rows: BatchRow[]; totalGhs: number }

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'
const headers = ['Agent', 'Sub-Agent', 'MoMo Number', 'GHS Amount'] as const

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`

/** Admin-only: fetch cleared rows and export the manual MoMo batch as CSV. */
export function MomoBatch() {
  const [batch, setBatch] = useState<Batch | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const exportCsv = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/payout-batch')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not build the batch.')
      const result = data as Batch
      setBatch(result)
      const lines = [
        headers.join(','),
        ...result.rows.map((r) => [r.agent, r.subAgent, r.momoNumber, r.amountGhs.toFixed(2)].map(csvCell).join(',')),
      ]
      const url = URL.createObjectURL(new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `gn-momo-batch-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not export the batch.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`${glass} rounded-3xl p-5 sm:p-6`} aria-label="MoMo payout batch">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-emerald-300"><WalletCards className="size-3.5" /> Payout batch</p>
          <AnimatedHeading as="h2" className="mt-1 text-base font-bold">Cleared MoMo payments</AnimatedHeading>
          <p className="mt-1 text-xs text-slate-500">Only client-signed-off commissions and overrides are included.</p>
        </div>
        <button type="button" onClick={exportCsv} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-300 px-4 text-xs font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-60">
          <Download className="size-4" /> {busy ? 'Exporting…' : 'Export MoMo CSV'}
        </button>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
      {batch && (
        <>
          <p className="mt-4 text-xs text-slate-400">{batch.rows.length} cleared row{batch.rows.length === 1 ? '' : 's'} · <strong className="text-emerald-300">GHS {batch.totalGhs.toFixed(2)}</strong></p>
          <div className="mt-3 max-h-72 overflow-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="sticky top-0 bg-[#0b1420] text-[10px] uppercase tracking-wider text-slate-500">
                <tr>{headers.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {batch.rows.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-500">Nothing cleared yet.</td></tr>
                ) : batch.rows.map((r, i) => (
                  <tr key={`${r.agent}-${r.subAgent}-${i}`} className="text-slate-300">
                    <td className="px-3 py-2 font-semibold text-white">{r.agent}</td>
                    <td className="px-3 py-2">{r.subAgent}</td>
                    <td className="px-3 py-2 font-mono text-cyan-200">{r.momoNumber}</td>
                    <td className="px-3 py-2 font-semibold text-emerald-300">{r.amountGhs.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
