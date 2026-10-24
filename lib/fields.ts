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
