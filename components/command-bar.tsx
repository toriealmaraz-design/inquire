'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CircleHelp, FileText, KeyRound, MessageCircle, Route, Search, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const COMMAND_EVENT = 'nexus:command'

export function openCommandBar() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(COMMAND_EVENT))
}

type Command = {
  id: string
  label: string
  hint: string
  href: string
  icon: LucideIcon
  keywords: string
}

const COMMANDS: Command[] = [
  { id: 'brief', label: 'Start a brief', hint: 'Three-step secure intake', href: '/intake', icon: FileText, keywords: 'start new request intake quote brief service' },
  { id: 'estimate', label: 'Quick GHS estimate', hint: 'Shape a range in seconds', href: '/#quick-estimate', icon: Sparkles, keywords: 'price cost quote estimate ghs money' },
  { id: 'track', label: 'Track a ticket', hint: 'Check your brief status', href: '/track', icon: Search, keywords: 'ticket track order status delivery' },
  { id: 'chat', label: 'Live chat with an agent', hint: 'Talk to the team', href: '/chat', icon: MessageCircle, keywords: 'chat agent support human help person' },
  { id: 'workflow', label: 'How it works', hint: 'The path from brief to delivery', href: '/workflow', icon: Route, keywords: 'workflow process steps how it works' },
  { id: 'faq', label: 'Frequently asked questions', hint: 'Answers before you ask', href: '/faq', icon: CircleHelp, keywords: 'faq questions help answer payment deposit' },
  { id: 'signin', label: 'Staff sign in', hint: 'Agent and admin console', href: '/auth/signin', icon: KeyRound, keywords: 'staff agent admin login sign in console' },
]

/** Keyboard-first site navigation. Opens with ⌘K / Ctrl+K or the Nexus HUD chip. */
export function CommandBar() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActive(0)
    restoreRef.current?.focus?.()
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((current) => !current)
      } else if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    const onOpen = () => {
      restoreRef.current = document.activeElement as HTMLElement | null
      setOpen(true)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener(COMMAND_EVENT, onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(COMMAND_EVENT, onOpen)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focus = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => {
      document.body.style.overflow = previous
      window.cancelAnimationFrame(focus)
    }
  }, [open])

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return COMMANDS
    return COMMANDS.filter((command) => `${command.label} ${command.hint} ${command.keywords}`.toLowerCase().includes(needle))
  }, [query])

  useEffect(() => setActive(0), [query])

  if (!open) return null

  const go = (command: Command) => {
    setOpen(false)
    setQuery('')
    setActive(0)
    router.push(command.href)
  }

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((current) => (results.length ? (current + 1) % results.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => (results.length ? (current - 1 + results.length) % results.length : 0))
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault()
      go(results[active])
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]" role="presentation">
      <button aria-label="Close command menu" onClick={close} className="absolute inset-0 cursor-default bg-[#060b14]/80 backdrop-blur-md" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nexus command menu"
        className="nexus-command-panel relative w-full max-w-xl overflow-hidden rounded-3xl border border-[rgba(0,240,255,0.22)] bg-[#0a0f1c]/95 shadow-2xl shadow-black/70"
        style={{ animation: 'command-in 260ms cubic-bezier(.2,.8,.2,1) both' }}
      >
        <div className="flex items-center gap-3 border-b border-[rgba(0,240,255,0.14)] px-5 py-4">
          <Search className="size-5 shrink-0 text-cyan-300" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Search commands, tickets, help…"
            aria-label="Search commands"
            aria-activedescendant={results[active] ? `command-${results[active].id}` : undefined}
            className="h-8 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
          <kbd className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-400">ESC</kbd>
        </div>

        <div className="max-h-[56vh] overflow-y-auto p-2" role="listbox" aria-label="Available commands">
          {results.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-400">No commands match “{query}”. Try “brief”, “ticket”, or “chat”.</p>
          )}
          {results.map((command, index) => {
            const Icon = command.icon
            const selected = index === active
            return (
              <button
                key={command.id}
                id={`command-${command.id}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(command)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${selected ? 'bg-cyan-300/10 text-white' : 'text-slate-300 hover:bg-white/5'}`}
              >
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${selected ? 'border-cyan-300/40 bg-cyan-300/15 text-cyan-200' : 'border-white/10 bg-white/[.03] text-slate-400'}`}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{command.label}</span>
                  <span className="block truncate text-xs text-slate-500">{command.hint}</span>
                </span>
                <ArrowRight className={`size-4 shrink-0 ${selected ? 'text-cyan-300' : 'text-slate-600'}`} />
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3 text-[11px] text-slate-500">
          <span>Arrow keys to move · Enter to open</span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-white/10 px-1.5 py-0.5">↑</kbd>
            <kbd className="rounded border border-white/10 px-1.5 py-0.5">↓</kbd>
            <kbd className="rounded border border-white/10 px-1.5 py-0.5">↵</kbd>
          </span>
        </div>
      </div>
    </div>
  )
}

export default CommandBar
