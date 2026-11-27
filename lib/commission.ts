// Margin-safe override math. All inputs are GHS amounts already owed to someone
// else: specialistFeeGhs is the assigned worker's pay, directAgentCommissionGhs
// is the referring agent's pay. An override is carved only out of what remains
// for the platform, never out of either of those payouts.

export const OVERRIDE_RATE = 0.15

const nonNegative = (value: unknown) => {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

export function roundGhs(value: number) {
  return Math.round((nonNegative(value) + Number.EPSILON) * 100) / 100
}

/** Platform margin left after the specialist and direct agent have been paid. */
export function netMargin(priceGhs: number | string | null, specialistFeeGhs: number | string | null, directAgentCommissionGhs: number | string | null) {
  return roundGhs(nonNegative(priceGhs) - nonNegative(specialistFeeGhs) - nonNegative(directAgentCommissionGhs))
}

/** 15% of positive platform margin; zero when there is no margin to share. */
export function subAgentOverride(net: number | string | null) {
  return roundGhs(nonNegative(net) * OVERRIDE_RATE)
}

/** Stable pseudonym for rosters and payout batches — never exposes contact data. */
export function agentDisplayLabel(id: number, referralCode?: string | null) {
  const seed = `${id}:${referralCode || ''}`
  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619) >>> 0
  return `Agent ${hash.toString(16).toUpperCase().padStart(8, '0').slice(0, 4)}`
}

export function momoFromProfile(profile: unknown): string {
  if (!profile || typeof profile !== 'object') return '—'
  const p = profile as Record<string, unknown>
  const value = p.momoNumber ?? p.momo_number ?? p.momo
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 30) : '—'
}

// Campus ranks are earned only by referrals that were completed AND paid.
// Sign-ups and quoted briefs never move an agent up the ladder.
export const AGENT_TIERS = [
  { rank: 'Scout', minPaidReferrals: 0 },
  { rank: 'Connector', minPaidReferrals: 5 },
  { rank: 'Campus Lead', minPaidReferrals: 15 },
] as const

export type AgentTier = {
  rank: string
  paidReferrals: number
  nextRank: string | null
  nextAt: number | null
  remaining: number
  progressPercent: number
  ladder: readonly { rank: string; minPaidReferrals: number }[]
}

export function agentTier(paidReferralCount: number): AgentTier {
  const paid = Math.floor(nonNegative(paidReferralCount))
  let index = 0
  for (let i = AGENT_TIERS.length - 1; i >= 0; i--) {
    if (paid >= AGENT_TIERS[i].minPaidReferrals) { index = i; break }
  }
  const current = AGENT_TIERS[index]
  const next = AGENT_TIERS[index + 1] ?? null
  const span = next ? next.minPaidReferrals - current.minPaidReferrals : 0
  return {
    rank: current.rank,
    paidReferrals: paid,
    nextRank: next?.rank ?? null,
    nextAt: next?.minPaidReferrals ?? null,
    remaining: next ? next.minPaidReferrals - paid : 0,
    progressPercent: next ? Math.min(100, Math.round(((paid - current.minPaidReferrals) / span) * 100)) : 100,
    ladder: AGENT_TIERS,
  }
}

/** Only a completed referral that has been paid counts toward rank or receipts. */
export function isPaidReferral(row: { paidAt?: unknown; status?: string | null }): boolean {
  return Boolean(row.paidAt) && /delivered|complete|paid/i.test(row.status || '')
}

export const COMMISSION_STAGES = ['Quoted', 'In Progress', 'Delivered & Cleared', 'Paid Out'] as const
export type CommissionStage = (typeof COMMISSION_STAGES)[number]

/** Ticket lifecycle derived from job status, clearance and payment timestamps. */
export function commissionStage(row: { status?: string | null; commissionStatus?: string | null; paidAt?: unknown; clientSignoffAt?: unknown }): CommissionStage {
  const status = (row.status || '').toLowerCase()
  const delivered = /delivered|complete|paid/.test(status)
  if (row.paidAt) return 'Paid Out'
  if (delivered && (row.clientSignoffAt || row.commissionStatus === 'AVAILABLE')) return 'Delivered & Cleared'
  if (delivered || /assigned|progress|revision/.test(status)) return 'In Progress'
  return 'Quoted'
}
