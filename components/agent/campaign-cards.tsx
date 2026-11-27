'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { AnimatedHeading } from '@/components/visual/animated-heading'

// Intentional campaign palette exception: these cards do not use the portal palette.
const BACKGROUND = '#09090B'
const ACCENT = '#00F5D4'
const SECONDARY = '#7B2CBF'

function GnEmblem() {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border text-sm font-black tracking-tight" style={{ backgroundColor: BACKGROUND, borderColor: ACCENT, color: ACCENT }} aria-label="GN emblem">
      GN
    </span>
  )
}

/** Two copy-ready pitches: one for stressed classmates, one for prospective sub-agents. */
export function CampaignCards({ clientLink, subAgentLink }: { clientLink: string; subAgentLink: string }) {
  const [copied, setCopied] = useState('')

  const cards = [
    {
      key: 'client',
      audience: 'For classmates',
      title: 'Stressed by a deadline?',
      body: 'Reach classmates who are juggling assignments, presentations and research. Share your link so they can request a quote and get help.',
      message: `Stressed by a campus deadline? Gemini Nexus helps with programming, slides, research and other academic work. Send your brief through my link and I earn a commission when the job is paid: ${clientLink}`,
      link: clientLink,
    },
    {
      key: 'subagent',
      audience: 'For peers who want to earn',
      title: 'Join my campus network',
      body: 'Invite peers who want to earn from referrals without taking on delivery work. They earn direct commissions, and any upline override comes only from the platform margin.',
      message: `Want to earn on campus by referring work? Join the Gemini Nexus agent network as a sub-agent. You earn a direct commission on jobs you refer, and upline overrides come only from the platform margin. Join through my link: ${subAgentLink}`,
      link: subAgentLink,
    },
  ]

  const copyMessage = async (key: string, message: string) => {
    if (!message.includes('http')) return
    try {
      await navigator.clipboard.writeText(message)
      setCopied(key)
      window.setTimeout(() => setCopied(''), 2000)
    } catch {
      window.prompt('Copy this message:', message)
    }
  }

  return (
    <section className="mt-6" aria-label="Ready-to-share campaign cards">
      <AnimatedHeading as="h2" className="font-bold">Ready-to-share campaign cards</AnimatedHeading>
      <p className="mt-1 text-xs text-slate-500">Two dark-mode cards with copy-ready messages. The campaign palette is an intentional exception to the main portal colours.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {cards.map((card) => (
          <article key={card.key} className="flex flex-col rounded-3xl border p-5 sm:p-6" style={{ backgroundColor: BACKGROUND, borderColor: SECONDARY }}>
            <header className="flex items-center gap-3 border-b border-white/10 pb-4">
              <GnEmblem />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">Gemini Nexus — DIGITAL OPERATIONS NETWORK</p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>{card.audience}</p>
              </div>
            </header>
            <h3 className="mt-4 text-xl font-bold" style={{ color: ACCENT }}>{card.title}</h3>
            <p className="mt-2 text-xs leading-5 text-white/80">{card.body}</p>
            <p className="mt-4 rounded-2xl border p-3 text-[11px] leading-5 text-white/90" style={{ borderColor: SECONDARY }}>{card.message}</p>
            <button
              type="button"
              onClick={() => copyMessage(card.key, card.message)}
              disabled={!card.link}
              className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold motion-safe:transition disabled:opacity-50"
              style={{ backgroundColor: copied === card.key ? ACCENT : SECONDARY, color: BACKGROUND }}
            >
              {copied === card.key ? <><Check className="size-4" /> Message copied</> : <><Copy className="size-4" /> Copy message</>}
            </button>
            <p className="sr-only" aria-live="polite">{copied === card.key ? `${card.audience} message copied` : ''}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
