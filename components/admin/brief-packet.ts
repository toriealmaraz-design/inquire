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
const PHONE_RE = /\+?\d[\d\s().-]{7,18}\d/g
const URL_RE = /https?:\/\/[^\s,;"'<>]+|\/api\/storage\/file\?key=[^\s,;"'<>]+/gi
const REDACTED = '[contact removed]'

export function stripPersonalContact(text: string) {
  return text.replace(EMAIL_RE, REDACTED).replace(PHONE_RE, REDACTED)
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
    '',
    '## Upload links (R2 / Supabase)',
  ]
  const links = uploadLinks(brief.fileUrls)
  lines.push(...(links.length ? links.map((link) => `- ${link}`) : ['- None attached']))
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
