/** Shorten long copy without cutting a word in half. Used for chat and list previews. */
export function previewText(value: string, max = 80): string {
  const text = (value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  const head = text.slice(0, max)
  const lastSpace = head.lastIndexOf(' ')
  const safe = lastSpace > max * 0.6 ? head.slice(0, lastSpace) : head
  return `${safe.trimEnd()}…`
}
