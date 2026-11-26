import { defaultQuote, quoteFor, type QuoteSelection } from './pricing'

/** The four client-facing quick scopes. Every field is editable again in the estimator below. */
export type QuickScopePreset = {
  id: string
  label: string
  hint: string
  cat: string
  category: string
  academicLevel: string
  volume: number
  urgency: string
  citationAudit: boolean
}

export const quickScopePresets: QuickScopePreset[] = [
  {
    id: 'code-fix', label: 'Code Fix / Script', hint: 'Debug or write a script', cat: 'code',
    category: 'Code Debugging & Architecture Review', academicLevel: 'Undergraduate', volume: 4, urgency: '24-Hour Priority', citationAudit: false,
  },
  {
    id: 'research', label: 'Research & Formatting', hint: 'Sources, structure, citations', cat: 'general',
    category: 'Proofreading & Formatting', academicLevel: 'Undergraduate', volume: 8, urgency: 'Standard', citationAudit: true,
  },
  {
    id: 'slides', label: 'Slide Deck / Visuals', hint: 'Presentation-ready slides', cat: 'slides',
    category: 'Slide Deck Design', academicLevel: 'Undergraduate', volume: 10, urgency: '48-Hour', citationAudit: false,
  },
  {
    id: 'system', label: 'System / Web Task', hint: 'Hands-on technical help', cat: 'system',
    category: 'Data Analysis Walkthrough', academicLevel: 'Undergraduate', volume: 5, urgency: 'Standard', citationAudit: false,
  },
]

/** Identifies the preset currently reflected by the estimator, if any. */
export function activeQuickScope(quote?: QuoteSelection): string {
  if (!quote) return ''
  return quickScopePresets.find((preset) =>
    preset.category === quote.category &&
    preset.academicLevel === quote.academicLevel &&
    preset.volume === quote.volume &&
    preset.urgency === quote.urgency &&
    preset.citationAudit === quote.citationAudit,
  )?.id ?? ''
}

export function quoteForPreset(preset: QuickScopePreset): QuoteSelection {
  return quoteFor({ ...defaultQuote, ...preset })
}
