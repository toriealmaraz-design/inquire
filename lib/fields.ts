// Service fields. Staff are assigned one; announcements can target one.
// Values match the homepage intake tracks.
export const FIELDS = [
  { value: 'academic', label: 'Academic & Research' },
  { value: 'media', label: 'Presentations & Visuals' },
  { value: 'systems', label: 'Software, IT & Hands-on' },
] as const

export type FieldValue = (typeof FIELDS)[number]['value']

export function isField(value: unknown): value is FieldValue {
  return typeof value === 'string' && FIELDS.some((f) => f.value === value)
}

export function fieldLabel(value: string | null | undefined) {
  return FIELDS.find((f) => f.value === value)?.label ?? 'Unassigned'
}

// A readable name for a brief: its title, else the opening words of the brief
export function briefTitle(s: { title?: string | null; briefDetails?: string | null; serviceType?: string | null }) {
  const t = (s.title || '').trim()
  if (t) return t
  const first = (s.briefDetails || '').trim().split(/\n|(?<=[.!?])\s/)[0]?.trim() || ''
  if (first) return first.length > 70 ? `${first.slice(0, 67).trimEnd()}…` : first
  return `Untitled ${s.serviceType ? s.serviceType.split(' ')[0].toLowerCase() : ''} brief`.replace('  ', ' ')
}

// Ticket numbers: AC-2610-001 (Academic), MD-… (Media), IT-… (Systems); older ones GN-1042
export const TICKET_RE = /\b(?:(?:AC|MD|IT|GN)-?\d{4}-?\d{3}|GN-?\d{3,6})\b/i
export const normTicket = (t: string) => t.toUpperCase().replace(/-/g, '')
