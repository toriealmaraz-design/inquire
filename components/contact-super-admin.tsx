'use client'

import { useEffect, useState } from 'react'
import { Mail, MessageCircle, Send, Camera, Ghost, ShieldCheck } from 'lucide-react'

type Handles = { whatsapp?: string | null; telegram?: string | null; instagram?: string | null; snapchat?: string | null; email?: string | null }

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'

/** Admins only: reach the super admin directly on their social handles */
export function ContactSuperAdmin() {
  const [h, setH] = useState<Handles | null>(null)
  useEffect(() => {
    fetch('/api/settings').then((r) => (r.ok ? r.json() : null)).then(setH).catch(() => setH(null))
  }, [])
  if (!h) return null

  const links = [
    h.whatsapp && { label: 'WhatsApp', href: `https://wa.me/${h.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hi, this is an admin from Gemini Nexus.')}`, icon: MessageCircle, tone: 'bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25' },
    h.telegram && { label: 'Telegram', href: `https://t.me/${h.telegram}`, icon: Send, tone: 'bg-sky-500/15 text-sky-200 hover:bg-sky-500/25' },
    h.instagram && { label: 'Instagram', href: `https://ig.me/m/${h.instagram}`, icon: Camera, tone: 'bg-fuchsia-500/15 text-fuchsia-200 hover:bg-fuchsia-500/25' },
    h.snapchat && { label: 'Snapchat', href: `https://snapchat.com/add/${h.snapchat}`, icon: Ghost, tone: 'bg-yellow-400/15 text-yellow-100 hover:bg-yellow-400/25' },
    h.email && { label: 'Email', href: `mailto:${h.email}`, icon: Mail, tone: 'bg-white/10 text-slate-200 hover:bg-white/15' },
  ].filter(Boolean) as { label: string; href: string; icon: typeof Mail; tone: string }[]

  return (
    <div className={`${glass} rounded-3xl p-5 sm:p-6`}>
      <h2 className="flex items-center gap-2 font-bold"><ShieldCheck className="size-4 text-cyan-300" /> Contact the super admin</h2>
      <p className="mt-1 text-xs text-slate-500">For urgent issues, reach the super admin directly. Only admins can see these handles.</p>
      {links.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">The super admin hasn&apos;t added contact handles yet.</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {links.map(({ label, href, icon: Icon, tone }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${tone}`}>
              <Icon className="size-4" /> {label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
