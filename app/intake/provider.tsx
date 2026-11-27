'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadStorageFile } from '@/lib/client-upload'
import { readClientProfile, saveClientProfile } from '@/lib/client-profile'
import { defaultQuote, quoteFor, type QuoteSelection, type ScopeTrack } from '@/components/intake/pricing'
import { quoteForPreset, type QuickScopePreset } from '@/components/intake/quick-scope'

export type Track = ScopeTrack

type Draft = {
  track: Track
  quote: QuoteSelection
  title: string
  brief: string
  contact: string
  urgency: string
  clientName: string
  whatsapp: string
  university: string
  department: string
  deliverables: string[]
  ticketId: string
  sent: boolean
}

type IntakeContextValue = Draft & {
  hydrated: boolean
  file: File | null
  files: File[]
  returningClient: boolean
  error: string
  submitting: boolean
  setTrack: (value: Track) => void
  setTitle: (value: string) => void
  setBrief: (value: string) => void
  setContact: (value: string) => void
  setUrgency: (value: string) => void
  setClientName: (value: string) => void
  setWhatsapp: (value: string) => void
  setUniversity: (value: string) => void
  setDepartment: (value: string) => void
  setDeliverables: (value: string[]) => void
  setError: (value: string) => void
  updateQuote: (selection: QuoteSelection) => void
  applyQuickScope: (preset: QuickScopePreset) => void
  selectFile: (file: File | null) => void
  selectFiles: (files: File[]) => void
  removeFile: (index: number) => void
  dispatch: () => Promise<void>
  reset: () => void
}

const STORAGE_KEY = 'inquire_intake_draft'
const MAX_FILE_BYTES = 15 * 1024 * 1024
const REF_KEY = 'inquire_ref'
const REF_DAYS = 30

const defaults: Draft = {
  track: 'academic',
  quote: defaultQuote,
  title: '',
  brief: '',
  contact: '',
  urgency: 'Standard',
  clientName: '',
  whatsapp: '',
  university: '',
  department: '',
  deliverables: [],
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
  const [files, setFiles] = useState<File[]>([])
  const [returningClient, setReturningClient] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const file = files[0] ?? null

  useEffect(() => {
    rememberReferral()
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Draft>
        setDraft({ ...defaults, ...saved, quote: quoteFor({ ...defaultQuote, ...saved.quote }) })
      }
    } catch {}
    // Repeat clients keep their details in this browser only.
    const profile = readClientProfile()
    if (profile) {
      setReturningClient(true)
      setDraft((current) => ({
        ...current,
        clientName: current.clientName || profile.name,
        whatsapp: current.whatsapp || profile.whatsapp,
        university: current.university || profile.university,
        department: current.department || profile.department,
        contact: current.contact || profile.whatsapp,
      }))
    }
    // Deep links from service cards / agent promo presets preselect the brief.
    const params = new URLSearchParams(window.location.search)
    const requested = params.get('track')
    if (requested === 'academic' || requested === 'media' || requested === 'systems') {
      setDraft((current) => ({ ...current, track: requested }))
    }
    const categoryPresets: Record<string, Partial<QuoteSelection>> = {
      code: { category: 'Code Debugging and Architecture Review', track: 'systems' },
      slides: { category: 'Slide Deck Design', track: 'media' },
      research: { category: 'Study Guide Preparation', track: 'academic' },
      system: { category: 'Data Analysis Walkthrough', track: 'systems' },
      general: { category: 'Proofreading and Formatting', track: 'academic' },
    }
    const preset = categoryPresets[params.get('cat') || '']
    if (preset) {
      setDraft((current) => {
        const quote = quoteFor({ ...current.quote, ...preset })
        return { ...current, track: quote.track, quote, urgency: quote.urgency }
      })
    }
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

  // Quick scopes only prefill — every field remains editable in the estimator and steps below.
  const applyQuickScope = useCallback((preset: QuickScopePreset) => {
    const quote = quoteForPreset(preset)
    setDraft((current) => ({ ...current, quote, track: quote.track, urgency: quote.urgency }))
  }, [])

  const selectFiles = useCallback((next: File[]) => {
    setError('')
    if (!next.length) {
      setFiles([])
      return
    }
    const accepted = next.filter((item) => item.size <= MAX_FILE_BYTES)
    const rejected = next.length - accepted.length
    if (rejected) setError(`${rejected} file${rejected === 1 ? ' was' : 's were'} over 15 MB and skipped. Keep each file under 15 MB.`)
    if (!accepted.length) return
    setFiles((current) => {
      const seen = new Set(current.map((item) => `${item.name}:${item.size}:${item.lastModified}`))
      return [...current, ...accepted.filter((item) => {
        const key = `${item.name}:${item.size}:${item.lastModified}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })]
    })
  }, [])

  const selectFile = useCallback((next: File | null) => selectFiles(next ? [next] : []), [selectFiles])

  const removeFile = useCallback((index: number) => {
    setFiles((current) => current.filter((_, position) => position !== index))
  }, [])

  const dispatch = useCallback(async () => {
    if (submitting) return
    const { title, brief, contact, quote, track, deliverables, clientName, whatsapp, university, department } = draft
    if (!title.trim() || !brief.trim() || !contact.trim()) {
      setError('A title, brief description and contact detail are required to dispatch your request.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const fileUrls: string[] = []
      if (files.length) {
        const supabase = createClient()
        for (const item of files) {
          try {
            fileUrls.push(await uploadStorageFile(supabase, item))
          } catch {
            throw new Error('A file could not be uploaded. Try again, or remove it and send it through Live Chat.')
          }
        }
      }
      const details = [
        brief.trim(),
        deliverables.length ? `Deliverables: ${deliverables.join(', ')}` : '',
        [
          clientName && `Client: ${clientName}`,
          whatsapp && `WhatsApp: ${whatsapp}`,
          university && `University: ${university}`,
          department && `Department: ${department}`,
        ].filter(Boolean).join('; '),
      ].filter(Boolean).join('\n\n')
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
          briefDetails: `${details}\n\nConsultation estimate: GHS ${quote.low}–${quote.high}; ${quote.academicLevel}; ${quote.citationAudit ? 'citation audit included' : 'no citation audit'}. Final quote confirmed after review.`,
          fileUrls: fileUrls.join(','),
          ref: readReferral(),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'We could not send your brief. Please try again.')
      saveClientProfile({ name: clientName.trim(), whatsapp: whatsapp.trim(), university: university.trim(), department: department.trim() })
      setReturningClient(true)
      setDraft((current) => ({ ...current, ticketId: data.ticketId || '', sent: true }))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [draft, files, submitting])

  const reset = useCallback(() => {
    const profile = readClientProfile()
    setDraft({
      ...defaults,
      clientName: profile?.name ?? '',
      whatsapp: profile?.whatsapp ?? '',
      university: profile?.university ?? '',
      department: profile?.department ?? '',
      contact: profile?.whatsapp ?? '',
    })
    setFiles([])
    setError('')
    try { sessionStorage.removeItem(STORAGE_KEY) } catch {}
  }, [])

  const value = useMemo<IntakeContextValue>(() => ({
    ...draft,
    hydrated,
    file,
    files,
    returningClient,
    error,
    submitting,
    setTrack: (value) => update('track', value),
    setTitle: (value) => update('title', value),
    setBrief: (value) => update('brief', value),
    setContact: (value) => update('contact', value),
    setUrgency: (value) => update('urgency', value),
    setClientName: (value) => update('clientName', value),
    setWhatsapp: (value) => update('whatsapp', value),
    setUniversity: (value) => update('university', value),
    setDepartment: (value) => update('department', value),
    setDeliverables: (value) => update('deliverables', value),
    setError,
    updateQuote,
    applyQuickScope,
    selectFile,
    selectFiles,
    removeFile,
    dispatch,
    reset,
  }), [draft, hydrated, file, files, returningClient, error, submitting, update, updateQuote, applyQuickScope, selectFile, selectFiles, removeFile, dispatch, reset])

  return <IntakeContext.Provider value={value}>{children}</IntakeContext.Provider>
}

export function useIntake() {
  const context = useContext(IntakeContext)
  if (!context) throw new Error('useIntake must be used inside IntakeProvider')
  return context
}
