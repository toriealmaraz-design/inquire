// Shared, server-safe definitions for the pre-delivery quality-assurance gate.
// Both the submissions API and the admin checklist UI use these exact keys.

export const QA_CHECK_KEYS = [
  'requirementsMatched',
  'filesVerified',
  'formattingRunnable',
  'noBrokenLinks',
] as const

export type QaCheckKey = (typeof QA_CHECK_KEYS)[number]
export type QaChecklist = Partial<Record<QaCheckKey, boolean>>

export const QA_CHECK_LABELS: Record<QaCheckKey, string> = {
  requirementsMatched: 'Requirements matched',
  filesVerified: 'Files verified',
  formattingRunnable: 'Formatting and code runnable',
  noBrokenLinks: 'No broken links',
}

/** Accepts the jsonb column (object or JSON string) and drops unknown keys. */
export function parseQaChecklist(value: unknown): QaChecklist {
  const raw = typeof value === 'string' ? (() => { try { return JSON.parse(value) } catch { return null } })() : value
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const source = raw as Record<string, unknown>
  const result: QaChecklist = {}
  for (const key of QA_CHECK_KEYS) {
    if (typeof source[key] === 'boolean') result[key] = source[key]
  }
  return result
}

/** Full-word labels for every check still outstanding. */
export function missingQaChecks(value: unknown): string[] {
  const parsed = parseQaChecklist(value)
  return QA_CHECK_KEYS.filter((key) => parsed[key] !== true).map((key) => QA_CHECK_LABELS[key])
}
