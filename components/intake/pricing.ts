/** Shared, transparent deadline pricing used by the landing teaser and intake estimator. */
export type DeadlineOption = {
  value: string
  short: string
  detail: string
  multiplier: number
  badge?: string
}

export const deadlineOptions: DeadlineOption[] = [
  { value: 'Early Bird (72h+)', short: 'More than 72 hours', detail: 'Ten percent less', multiplier: 0.9, badge: 'Ten percent early booking saving' },
  { value: 'Standard', short: 'Three to five days', detail: 'Standard rate', multiplier: 1 },
  { value: '48-Hour', short: '48 hours', detail: 'Ten percent more', multiplier: 1.1 },
  { value: '24-Hour Priority', short: '24 hours', detail: 'Twenty-five percent more', multiplier: 1.25 },
  { value: 'Emergency (<6h)', short: 'Under 6 hours', detail: 'Fifty percent more', multiplier: 1.5, badge: 'Fifty percent emergency surcharge' },
]

export function deadlineFor(value: string): DeadlineOption {
  return deadlineOptions.find((option) => option.value === value) ?? deadlineOptions[1]
}

export type ScopeTrack = 'academic' | 'media' | 'systems'

export type QuoteSelection = {
  category: string
  track: ScopeTrack
  academicLevel: string
  volume: number
  unit: string
  urgency: string
  citationAudit: boolean
  low: number
  high: number
}

export type QuoteCategory = {
  id: string
  title: string
  track: ScopeTrack
  unit: string
  lowRate: number
  highRate: number
}

export const quoteCategories: QuoteCategory[] = [
  { id: 'proofreading', title: 'Proofreading and Formatting', track: 'academic', unit: 'pages', lowRate: 8, highRate: 14 },
  { id: 'code-debugging', title: 'Code Debugging and Architecture Review', track: 'systems', unit: 'hours', lowRate: 35, highRate: 55 },
  { id: 'data-analysis', title: 'Data Analysis Walkthrough', track: 'systems', unit: 'hours', lowRate: 30, highRate: 48 },
  { id: 'slide-design', title: 'Slide Deck Design', track: 'media', unit: 'slides', lowRate: 12, highRate: 20 },
  { id: 'study-guides', title: 'Study Guide Preparation', track: 'academic', unit: 'modules', lowRate: 18, highRate: 30 },
]

export const academicLevels = ['Diploma', 'Undergraduate', 'Masters', 'Doctoral']

const levelMultipliers: Record<string, number> = {
  Diploma: 0.9,
  Undergraduate: 1,
  Masters: 1.2,
  Doctoral: 1.4,
}

/** Single source of truth for the estimate shown on the landing page and in intake. */
export function quoteFor(input: Partial<QuoteSelection> & { category: string }): QuoteSelection {
  const category = quoteCategories.find((item) => item.title === input.category) ?? quoteCategories[0]
  const academicLevel = input.academicLevel ?? 'Undergraduate'
  const volume = Math.min(20, Math.max(1, Math.round(input.volume ?? 6)))
  const urgency = input.urgency ?? 'Standard'
  const citationAudit = Boolean(input.citationAudit)
  const level = levelMultipliers[academicLevel] ?? 1
  const multiplier = deadlineFor(urgency).multiplier
  const audit = citationAudit ? 15 : 0

  return {
    category: category.title,
    track: category.track,
    academicLevel,
    volume,
    unit: category.unit,
    urgency,
    citationAudit,
    low: Math.round(category.lowRate * volume * level * multiplier + audit),
    high: Math.round(category.highRate * volume * level * multiplier + audit),
  }
}

export const defaultQuote = quoteFor({
  category: 'Proofreading and Formatting',
  academicLevel: 'Undergraduate',
  volume: 6,
  urgency: 'Standard',
})
