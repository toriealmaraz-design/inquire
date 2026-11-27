'use client'

import { useState } from 'react'
import { Copy } from 'lucide-react'

type Props = {
  ticketId: string
  staleFlag: string | null | undefined
  title?: string | null
}

/** Copies a plain-language follow-up note; no network request or polling. */
export function FollowUpNoteButton({ ticketId, staleFlag, title }: Props) {
  const [copied, setCopied] = useState(false)

  if (!staleFlag) return null

  const note = `Hello, this is a follow-up on ticket ${ticketId}${title ? ` (${title})` : ''}. ${staleFlag}. Please share the latest update or confirm the quote so we can continue.`

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(note)
      } else {
        const area = document.createElement('textarea')
        area.value = note
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        document.execCommand('copy')
        area.remove()
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={note}
      className="inline-flex h-8 items-center gap-1 rounded-lg border border-amber-300/40 bg-amber-400/10 px-2 text-[11px] font-semibold text-amber-200 hover:bg-amber-400/20"
    >
      <Copy className="size-3" /> {copied ? 'Follow-up note copied' : 'Copy follow-up note'}
    </button>
  )
}
