/** Shared, transparent deadline pricing used by the landing teaser and intake estimator. */
export type DeadlineOption = {
  value: string
  short: string
  detail: string
  multiplier: number
  badge?: string
}

export const deadlineOptions: DeadlineOption[] = [
  { value: 'Early Bird (72h+)', short: '72h+', detail: '−10%', multiplier: 0.9, badge: '10% early-bird' },
  { value: 'Standard', short: '3–5 days', detail: 'Base rate', multiplier: 1 },
  { value: '48-Hour', short: '48 hours', detail: '+10%', multiplier: 1.1 },
  { value: '24-Hour Priority', short: '24 hours', detail: '+25%', multiplier: 1.25 },
  { value: 'Emergency (<6h)', short: '<6 hours', detail: '×1.5', multiplier: 1.5, badge: '×1.5 emergency surcharge' },
]

export function deadlineFor(value: string): DeadlineOption {
  return deadlineOptions.find((option) => option.value === value) ?? deadlineOptions[1]
}
