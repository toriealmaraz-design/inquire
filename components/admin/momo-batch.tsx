'use client'

import { useState } from 'react'
import { Download, ReceiptText, WalletCards } from 'lucide-react'
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
  const [receiptTicket, setReceiptTicket] = useState('')
  const [receiptReference, setReceiptReference] = useState('')
  const [receiptDate, setReceiptDate] = useState('')
  const [receiptBusy, setReceiptBusy] = useState(false)
  const [receiptSaved, setReceiptSaved] = useState('')

  const saveReceipt = async () => {
    if (receiptBusy) return
    setReceiptBusy(true)
    setError('')
    setReceiptSaved('')
    try {
      const res = await fetch('/api/admin/payout-batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: receiptTicket, payoutReference: receiptReference, settlementDate: receiptDate }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not record the payout receipt.')
      setReceiptSaved(`Receipt recorded for ticket ${String(data.ticketId || receiptTicket)}.`)
      setReceiptReference('')
      setReceiptDate('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not record the payout receipt.')
    } finally {
      setReceiptBusy(false)
    }
  }

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
          <Download className="size-4" /> {busy ? 'Exporting the batch' : 'Export MoMo CSV'}
        </button>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}

      <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-[#0A0F1C]/70 p-4">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-cyan-300"><ReceiptText className="size-3.5" /> Payout receipt log</p>
        <AnimatedHeading as="h3" className="mt-1 text-sm font-bold">Record a MoMo transaction reference</AnimatedHeading>
        <p className="mt-1 text-[11px] text-slate-500">Agents see this reference and settlement date on their payout history and downloadable receipt.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <label className="text-[11px] font-semibold text-slate-400">
            Job ticket identifier
            <input value={receiptTicket} onChange={(e) => setReceiptTicket(e.target.value)} maxLength={20} placeholder="AC-2610-001" className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-[#060B14]/80 px-2.5 text-xs text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60" />
          </label>
          <label className="text-[11px] font-semibold text-slate-400">
            MoMo transaction reference
            <input value={receiptReference} onChange={(e) => setReceiptReference(e.target.value)} maxLength={120} placeholder="Transaction reference" className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-[#060B14]/80 px-2.5 text-xs text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60" />
          </label>
          <label className="text-[11px] font-semibold text-slate-400">
            Settlement date
            <input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-[#060B14]/80 px-2.5 text-xs text-white outline-none focus:border-cyan-300/60" />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={saveReceipt} disabled={receiptBusy || !receiptTicket.trim() || (!receiptReference.trim() && !receiptDate)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-cyan-300 px-3 text-[11px] font-bold text-[#060B14] transition hover:bg-cyan-200 disabled:opacity-50">
            {receiptBusy ? 'Recording receipt' : 'Record payout receipt'}
          </button>
          {receiptSaved && <span role="status" className="text-[11px] text-emerald-300">{receiptSaved}</span>}
        </div>
      </div>

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
