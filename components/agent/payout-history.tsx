'use client'

import { AnimatedHeading } from '@/components/visual/animated-heading'
import { Download, ReceiptText } from 'lucide-react'

export type Payout = {
  id: number
  ticketId: string
  date: string | null
  amountGhs: number
  status: string
  kind?: 'referral' | 'override'
  subAgent?: string | null
  payoutReference: string | null
  settlementDate: string | null
}

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'

export function formatPayoutDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Accra' }).format(date)
}

async function downloadReceipt(payout: Payout, agentName: string) {
  const text = [
    'GEMINI NEXUS — PAYOUT RECEIPT',
    '--------------------------------',
    `Agent: ${agentName || 'Gemini Nexus agent'}`,
    `Payout reference: ${payout.payoutReference || payout.ticketId}`,
    `Job ticket identifier: ${payout.ticketId}`,
    `Paid date: ${formatPayoutDate(payout.date)}`,
    `Settlement date: ${formatPayoutDate(payout.settlementDate)}`,
    `Commission: GHS ${payout.amountGhs.toFixed(2)}`,
    `Status: ${payout.status}`,
    `Payout type: ${payout.kind === 'override' ? 'Two-tier upline override' : 'Direct referral commission'}`,
    '',
    'An administrator records the MoMo transaction reference and settlement date. Until one is recorded, the job ticket identifier is the payout reference.',
  ].join('\n')
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `GN-receipt-${payout.ticketId}.txt`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      window.prompt('Copy receipt:', text)
    }
  }
}

/** Paid referrals and overrides from /api/agent/payouts with a per-row receipt. */
export function PayoutHistory({ payouts, totalPaidGhs, agentName }: { payouts: Payout[] | null; totalPaidGhs: number; agentName: string }) {
  return (
    <div className={`${glass} mt-6 rounded-3xl p-5 sm:p-6`}>
      <AnimatedHeading as="h2" className="flex items-center gap-2 font-bold"><ReceiptText className="size-4 text-cyan-300" /> Payout history and receipts</AnimatedHeading>
      <p className="mt-1 text-xs text-slate-500">Cleared commissions and margin-funded overrides. A recorded MoMo transaction reference and settlement date appear on each row.</p>

      {payouts === null ? (
        <p className="mt-4 text-sm text-slate-500">Loading…</p>
      ) : payouts.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No cleared referrals yet. Paid jobs you referred will appear here.</p>
      ) : (
        <>
          <p className="mt-4 text-xs text-slate-400">Cleared total <strong className="text-emerald-300">GHS {totalPaidGhs.toFixed(2)}</strong> across {payouts.length} payouts</p>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Payout reference</th>
                  <th className="px-4 py-3 font-medium">Job ticket identifier</th>
                  <th className="px-4 py-3 font-medium">Paid date</th>
                  <th className="px-4 py-3 font-medium">Settlement date</th>
                  <th className="px-4 py-3 font-medium">Commission</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"><span className="sr-only">Receipt</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {payouts.map((payout) => (
                  <tr key={`${payout.id}-${payout.kind || 'referral'}`} className="hover:bg-white/[0.04]">
                    <td className="px-4 py-3 font-mono text-cyan-200">{payout.payoutReference || payout.ticketId}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{payout.ticketId}</td>
                    <td className="px-4 py-3 text-slate-400">{formatPayoutDate(payout.date)}</td>
                    <td className="px-4 py-3 text-slate-400">{formatPayoutDate(payout.settlementDate)}</td>
                    <td className="px-4 py-3 font-semibold text-white">GHS {payout.amountGhs.toFixed(2)}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300">{payout.status}</span></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => downloadReceipt(payout, agentName)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200"
                        aria-label={`Download receipt for ${payout.ticketId}`}
                      >
                        <Download className="size-3" /> Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">When no administrator-recorded reference exists, the job ticket identifier doubles as the payout reference. Override payouts are funded from Gemini Nexus margin, never from specialist pay or the direct agent&apos;s cut.</p>
        </>
      )}
    </div>
  )
}
