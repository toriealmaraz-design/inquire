// Client-side deadline helpers. The submissions API has no dedicated deadline
// column yet, so prefer one when present and fall back to the brief's own text
// and urgency (24-hour / 48-hour / standard) without any new requests.

export type DeadlineSource = {
  createdAt?: string | null
  deadline?: string | null
  deadlineAt?: string | null
  dueAt?: string | null
  dueDate?: string | null
  urgency?: string | null
  briefDetails?: string | null
  paidAt?: string | null
}

export function parseDate(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text) return null

  const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (dmy) {
    const year = Number(dmy[3]) < 100 ? 2000 + Number(dmy[3]) : Number(dmy[3])
    const parsed = new Date(year, Number(dmy[2]) - 1, Number(dmy[1])).getTime()
    return Number.isFinite(parsed) ? parsed : null
  }

  const parsed = Date.parse(text)
  return Number.isFinite(parsed) ? parsed : null
}

export function extractDeadline(brief: DeadlineSource): number | null {
  for (const key of ['deadline', 'deadlineAt', 'dueAt', 'dueDate'] as const) {
    const parsed = parseDate(brief[key])
    if (parsed) return parsed
  }

  // Bounded capture: stop at a newline or semicolon, never scan the whole brief.
  const hit = (brief.briefDetails || '').match(/\b(?:deadline|due(?:\s+by|\s+date)?|by)\s*:?\s*([^\n;]{3,60})/i)
  if (hit) {
    const parsed = parseDate(hit[1])
    if (parsed) return parsed
  }

  const base = parseDate(brief.createdAt) ?? Date.now()
  const urgency = (brief.urgency || '').toLowerCase()
  const relative = urgency.match(/\b(\d{1,3})\s*(hours?|hrs?|days?)\b/)
  if (relative) {
    const amount = Number(relative[1])
    const unit = relative[2].startsWith('h') || relative[2].startsWith('r') ? 3_600_000 : 86_400_000
    return base + amount * unit
  }
  if (/\btomorrow\b/.test(urgency)) return base + 86_400_000
  if (/\bstandard\b/.test(urgency)) return base + 5 * 86_400_000

  return null
}

export function formatDeadline(ts: number) {
  return new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
}
