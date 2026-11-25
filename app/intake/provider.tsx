'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { QuoteSelection } from '@/components/quote-estimator'

export type Track = 'academic' | 'media' | 'systems'

type Draft = {
  track: Track
  quote: QuoteSelection
  title: string
  brief: string
  contact: string
  urgency: string
  ticketId: string
  sent: boolean
}

type IntakeContextValue = Draft & {
  hydrated: boolean
  file: File | null
  error: string
  submitting: boolean
  setTrack: (value: Track) => void
  setTitle: (value: string) => void
  setBrief: (value: string) => void
  setContact: (value: string) => void
  setUrgency: (value: string) => void
  setError: (value: string) => void
  updateQuote: (selection: QuoteSelection) => void
  selectFile: (file: File | null) => void
  dispatch: () => Promise<void>
  reset: () => void
}

const STORAGE_KEY = 'inquire_intake_draft'
const MAX_FILE_BYTES = 15 * 1024 * 1024
const REF_KEY = 'inquire_ref'
const REF_DAYS = 30

const defaultQuote: QuoteSelection = {
  category: 'Proofreading & Formatting',
  track: 'academic',
  academicLevel: 'Undergraduate',
  volume: 6,
  unit: 'pages',
  urgency: 'Standard',
  citationAudit: false,
  low: 48,
  high: 84,
}

const defaults: Draft = {
  track: 'academic',
  quote: defaultQuote,
  title: '',
  brief: '',
  contact: '',
  urgency: 'Standard',
  ticketId: '',
  sent: false,
}

const IntakeContext = createContext<IntakeContextValue | null>(null)

function readReferral(): string {
  try {
    const cookie = document.cookie.split('; ').find((item) => item.startsWith(`${REF_KEY}=`))?.split('=').slice(1).join('=')
    if (cookie) return decodeURIComponent(cookie)
    const saved = JSON.parse(localStorage.getItem(REF_KEY) || 'null')
    if (saved?.code && Date.now() - saved.at < REF_DAYS * 86_400_000) return saved.code
  } catch {}
  return ''
}

function rememberReferral() {
  const ref = new URLSearchParams(window.location.search).get('ref')
  if (!ref || !/^[A-Za-z0-9]{4,20}$/.test(ref)) return
  const code = ref.toUpperCase()
  localStorage.setItem(REF_KEY, JSON.stringify({ code, at: Date.now() }))
  document.cookie = `${REF_KEY}=${encodeURIComponent(code)}; Max-Age=${REF_DAYS * 86_400}; Path=/; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`
}

export function IntakeProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false)
  const [draft, setDraft] = useState<Draft>(defaults)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    rememberReferral()
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Draft>
        setDraft({ ...defaults, ...saved, quote: { ...defaultQuote, ...saved.quote } })
      }
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    } catch {}
  }, [draft, hydrated])

  const update = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }, [])

  const updateQuote = useCallback((quote: QuoteSelection) => {
    setDraft((current) => ({ ...current, quote, track: quote.track, urgency: quote.urgency }))
  }, [])

  const selectFile = useCallback((next: File | null) => {
    setError('')
    if (next && next.size > MAX_FILE_BYTES) {
      setError('That file is over 15 MB. Zip it, compress it, or send it through Live Chat.')
      setFile(null)
      return
    }
    setFile(next)
  }, [])

  const dispatch = useCallback(async () => {
    if (submitting) return
    const { title, brief, contact, quote, track } = draft
    if (!title.trim() || !brief.trim() || !contact.trim()) {
      setError('A title, brief description and contact detail are required to dispatch your request.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      let fileUrls = ''
      if (file) {
        const supabase = createClient()
        const path = `intake/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { error: uploadError } = await supabase.storage.from('uploads').upload(path, file, { upsert: false })
        if (uploadError) throw new Error('Your file could not be uploaded. Try again, or remove it and send it through Live Chat.')
        fileUrls = supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl
      }
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: track,
          serviceType: quote.category,
          title,
          scope: `${quote.volume} ${quote.unit}`,
          urgency: quote.urgency,
          clientContact: contact,
          briefDetails: `${brief}\n\nConsultation estimate: GHS ${quote.low}–${quote.high}; ${quote.academicLevel}; ${quote.citationAudit ? 'citation audit included' : 'no citation audit'}. Final quote confirmed after review.`,
          fileUrls,
          ref: readReferral(),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'We could not send your brief. Please try again.')
      setDraft((current) => ({ ...current, ticketId: data.ticketId || '', sent: true }))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [draft, file, submitting])

  const reset = useCallback(() => {
    setDraft(defaults)
    setFile(null)
    setError('')
    try { sessionStorage.removeItem(STORAGE_KEY) } catch {}
  }, [])

  const value = useMemo<IntakeContextValue>(() => ({
    ...draft,
    hydrated,
    file,
    error,
    submitting,
    setTrack: (value) => update('track', value),
    setTitle: (value) => update('title', value),
    setBrief: (value) => update('brief', value),
    setContact: (value) => update('contact', value),
    setUrgency: (value) => update('urgency', value),
    setError,
    updateQuote,
    selectFile,
    dispatch,
    reset,
  }), [draft, hydrated, file, error, submitting, update, updateQuote, selectFile, dispatch, reset])

  return <IntakeContext.Provider value={value}>{children}</IntakeContext.Provider>
}

export function useIntake() {
  const context = useContext(IntakeContext)
  if (!context) throw new Error('useIntake must be used inside IntakeProvider')
  return context
}
