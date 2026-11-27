import { academicLevels } from './pricing'
import { isFileLink } from '@/lib/storage-link'

// Shared client-facing trust copy. Every label here is written out in full words.
export const MAX_REVISIONS = 2
export const QA_BUFFER_LABEL = '2 hour internal quality-assurance buffer'
export const REVISION_LOCK_LABEL = `Hard limit of ${MAX_REVISIONS} revision rounds`

type ScopeSummaryRow = {
  serviceType?: string | null
  scope?: string | null
  urgency?: string | null
  briefDetails?: string | null
}

const asText = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
const urgencyKey = (value: string | null | undefined) => (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** Written-out urgency label for a client-facing scope card. */
export function urgencyLabel(value: string | null | undefined): string {
  const key = urgencyKey(value)
  if (key.includes('early bird')) return 'Early booking, more than 72 hours'
  if (key.includes('emergency')) return 'Emergency, under 6 hours'
  if (key.includes('24 hour')) return 'Priority, 24 hours'
  if (key.includes('48 hour')) return '48 hours'
  return 'Standard, three to five days'
}

/** A realistic window from specialist confirmation; never an instant promise. */
export function completionWindow(value: string | null | undefined): string {
  const key = urgencyKey(value)
  if (key.includes('early bird')) return '72–120 hours'
  if (key.includes('emergency')) return '4–6 hours'
  if (key.includes('24 hour')) return '18–24 hours'
  if (key.includes('48 hour')) return '36–48 hours'
  return '3–5 days'
}

/** Only comma-separated stored links are treated as delivered files. */
export function parseFileLinks(raw: string | null | undefined): string[] {
  if (typeof raw !== 'string') return []
  return raw.split(',').map((item) => item.trim()).filter((item) => isFileLink(item)).slice(0, 24)
}

/** A readable file name from an R2 proxy key or a public storage URL. */
export function fileNameFromLink(url: string): string {
  try {
    const parsed = new URL(url, 'https://gemini-nexus.local')
    const key = parsed.searchParams.get('key')
    const last = (key || parsed.pathname).split('/').filter(Boolean).pop() || url
    return decodeURIComponent(last).slice(0, 120) || url
  } catch {
    return url.slice(0, 120)
  }
}

/** Handles both ISO strings and driver-parsed timestamps without guessing. */
export function formatTimestamp(value: unknown): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Scope facts derived only from non-contact fields. Brief details are read for
 * explicit deliverable / estimate lines; names, numbers and email addresses are
 * never copied into the public ticket response.
 */
export function scopeSummaryFor(row: ScopeSummaryRow): string[] {
  const items: string[] = []
  const service = asText(row.serviceType, 100)
  if (service) items.push(`Service: ${service}`)

  const scope = asText(row.scope, 50)
  if (scope) items.push(`Scope: ${scope}`)

  const urgency = asText(row.urgency, 50)
  if (urgency) items.push(`Deadline: ${urgencyLabel(urgency)}`)

  const details = asText(row.briefDetails, 4000)
  const deliverables = (details.match(/^Deliverables:\s*(.+)$/im)?.[1] || '')
    .split(',')
    .map((item) => item.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 8)
  if (deliverables.length) items.push(`Deliverables: ${deliverables.join(', ')}`)

  const estimate = details.split('\n').find((line) => line.startsWith('Consultation estimate:')) || ''
  const level = academicLevels.find((item) => estimate.includes(`${item};`))
  if (level) items.push(`Academic level: ${level}`)
  if (/citation audit included/i.test(estimate)) items.push('Detailed citation and formatting audit: included')
  else if (/no citation audit/i.test(estimate)) items.push('Detailed citation and formatting audit: not included')

  if (!items.length) items.push('The specialist has not recorded a scope summary for this ticket yet.')
  return items
}
