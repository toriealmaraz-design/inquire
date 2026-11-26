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
