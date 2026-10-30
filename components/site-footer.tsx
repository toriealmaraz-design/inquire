import { MessageCircle } from 'lucide-react'
import { BrandLogo } from '@/components/branding'

const nav = [
  { href: '/', label: 'Intake portal' },
  { href: '/workflow', label: 'How it works' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/feedback', label: 'Feedback' },
  { href: '/chat', label: 'Live chat' },
]
const legal = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
]

/** Global site footer with links to info & legal pages. */
export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-[#06121d]/80">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <BrandLogo width={36} height={36} className="size-9 rounded-xl object-cover" />
            <strong className="text-sm tracking-tight text-white">Gemini Nexus</strong>
          </div>
          <p className="mt-4 max-w-xs text-xs leading-5 text-slate-500">
            One secure intake line for academic research, visual media, and technical systems support. Ghana operational · custom GHS quotes.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">Explore</p>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
            {nav.map((l) => <li key={l.href}><a href={l.href} className="hover:text-white">{l.label}</a></li>)}
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">Legal</p>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
            {legal.map((l) => <li key={l.href}><a href={l.href} className="hover:text-white">{l.label}</a></li>)}
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">Get in touch</p>
          <a href="/chat" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-300/20">
            <MessageCircle className="size-4" /> Live chat with an agent
          </a>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>© {new Date().getFullYear()} Gemini Nexus. All rights reserved.</p>
          <p className="flex gap-4">
            {legal.map((l) => <a key={l.href} href={l.href} className="hover:text-slate-300">{l.label}</a>)}
          </p>
        </div>
      </div>
    </footer>
  )
}
