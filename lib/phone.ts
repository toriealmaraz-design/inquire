// Shared contact normalisation for client folders and high-risk phone flags.
// Matches "024 000 0000", "+233 24 000 0000" and "233240000000" to the same key.
export function contactKey(raw: string | null | undefined): string {
  const value = (raw || '').trim().toLowerCase()
  if (!value) return ''
  const digits = value.replace(/\D/g, '')
  const compact = value.replace(/[\s+()-]/g, '')
  if (digits.length >= 9 && digits.length >= compact.length - 1) {
    return `tel:${digits.slice(-9)}`
  }
  return value.replace(/^@/, '')
}
