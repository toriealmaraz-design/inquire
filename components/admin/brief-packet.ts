import { extractDeadline, formatDeadline, type DeadlineSource } from './deadline'

export type PacketBrief = DeadlineSource & {
  ticketId: string
  title?: string | null
  serviceType?: string | null
  scope?: string | null
  briefDetails?: string | null
  fileUrls?: string | null
}

// Linear, bounded redactions: no nested quantifiers, long runs are capped.
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
// A candidate is only redacted when it actually contains a phone-length run of
// digits, so dates, deadlines and short technical specifications stay intact.
const PHONE_CANDIDATE_RE = /\+?\d[\d\s().-]{7,22}\d/g
const REFERRAL_RE = /(?:\b(?:referral|referrer|upline|referred\s+by|agent)\s*(?:code|label|id)?\s*[:=#]\s*|\b(?:referral|referrer|upline|referred\s+by|agent\s+(?:code|label|id))\s+|[?&]ref=)[A-Za-z0-9@._-]{2,24}\b/gi
// Case-sensitive so ordinary phrases like "agent required" stay untouched.
const AGENT_LABEL_RE = /\b(?:Agent|Upline)\s+[A-Z][A-Za-z0-9]{2,24}\b/g
const COMMISSION_RE = /(\b(?:commission|override|specialist\s+fee|agent\s+cut|payout)\b[^.\n]{0,40}?)(?:(?:GHS|GH¢|₵)\s*)?(\d[\d,]*(?:\.\d{1,2})?)\s*%?/gi
const URL_RE = /https?:\/\/[^\s,;"'<>]+|\/api\/storage\/file\?key=[^\s,;"'<>]+/gi
const REDACTED = '[contact removed]'
const REFERRAL_REMOVED = '[referral removed]'
const AMOUNT_REMOVED = '[amount removed]'

export function stripPersonalContact(text: string) {
  return text
    .replace(EMAIL_RE, REDACTED)
    .replace(PHONE_CANDIDATE_RE, (match) => {
      const digits = match.replace(/\D/g, '')
      return digits.length >= 9 && digits.length <= 15 ? REDACTED : match
    })
    .replace(REFERRAL_RE, REFERRAL_REMOVED)
    .replace(AGENT_LABEL_RE, REFERRAL_REMOVED)
    .replace(COMMISSION_RE, (_match, prefix: string) => `${prefix}${AMOUNT_REMOVED}`)
}

function uploadLinks(raw: string | null | undefined) {
  const links: string[] = []
  for (const match of (raw || '').match(URL_RE) || []) {
    try {
      // R2-backed links are stored as same-origin paths; make them usable outside the app.
      const absolute = match.startsWith('/') && typeof window !== 'undefined'
        ? new URL(match, window.location.origin).toString()
        : match
      const url = new URL(absolute)
      if (url.protocol === 'http:' || url.protocol === 'https:') links.push(url.toString())
    } catch {
      // Skip malformed links rather than leaking raw text into the packet.
    }
  }
  return [...new Set(links)]
}

const SPECIALIST_FOOTER = 'Specialist brief only. Client contact and referral details are removed. Support is limited to structuring, debugging, formatting and study guidance.'

export function buildBriefPacket(brief: PacketBrief) {
  const deadline = extractDeadline(brief)
  const lines = [
    `# Specialist brief · ${stripPersonalContact(brief.ticketId)}`,
    '',
    '## Ticket ID',
    stripPersonalContact(brief.ticketId),
    '',
    '## Deadline',
    deadline ? formatDeadline(deadline) : 'Not specified',
    '',
    '## Deliverables',
    `- Service: ${stripPersonalContact(brief.serviceType || 'Not specified')}`,
    `- Scope: ${stripPersonalContact(brief.scope || 'Not specified')}`,
    `- Brief: ${stripPersonalContact(brief.title || brief.briefDetails || 'Not specified')}`,
  ]
  if (brief.briefDetails && brief.title) {
    lines.push(`- Technical and academic specifications: ${stripPersonalContact(brief.briefDetails)}`)
  }
  lines.push('', '## Upload links (R2 / Supabase)')
  const links = uploadLinks(brief.fileUrls)
  lines.push(...(links.length ? links.map((link) => `- ${link}`) : ['- None attached']))
  lines.push('', SPECIALIST_FOOTER)
  return `${lines.join('\n')}\n`
}

export function downloadBriefPacket(brief: PacketBrief) {
  const blob = new Blob([buildBriefPacket(brief)], { type: 'text/markdown;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = `${brief.ticketId.replace(/[^a-z0-9-]/gi, '_') || 'brief'}-specialist.md`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}
