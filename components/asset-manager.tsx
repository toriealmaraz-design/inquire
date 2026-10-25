'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ImagePlus, Loader2, Check, AlertCircle } from 'lucide-react'

const MAX_ASSET_BYTES = 15 * 1024 * 1024

export function AssetManager() {
  const [busy, setBusy] = useState<'logo' | 'favicon' | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function upload(kind: 'logo' | 'favicon', file: File | undefined) {
    if (!file) return
    setError('')
    setMessage('')
    if (file.size > MAX_ASSET_BYTES) return setError('This file is over 15 MB.')
    if (!file.type.startsWith('image/')) return setError('Please choose an image file.')

    setBusy(kind)
    try {
      const supabase = createClient()
      const path = `branding/${kind}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
      const { error: uploadError } = await supabase.storage.from('site-assets').upload(path, file, { contentType: file.type, upsert: true })
      if (uploadError) throw uploadError
      const url = supabase.storage.from('site-assets').getPublicUrl(path).data.publicUrl
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [`${kind}Url`]: url }),
      })
      if (!response.ok) throw new Error('Could not save the asset setting.')
      setMessage(`${kind === 'logo' ? 'Logo' : 'Favicon'} updated.`)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-8 border-t border-white/10 pt-6">
      <h3 className="font-semibold">Brand assets</h3>
      <p className="mt-1 text-xs text-slate-500">Upload a logo or favicon. Image files up to 15 MB are supported.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(['logo', 'favicon'] as const).map((kind) => (
          <label key={kind} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white hover:border-cyan-400/40">
            <ImagePlus className="size-5 text-cyan-300" />
            <span className="flex-1">Upload {kind}</span>
            {busy === kind ? <Loader2 className="size-4 animate-spin" /> : <input className="sr-only" type="file" accept="image/*" onChange={(event) => upload(kind, event.target.files?.[0])} />}
          </label>
        ))}
      </div>
      {message && <p className="mt-3 flex items-center gap-2 text-xs text-emerald-300"><Check className="size-4" />{message}</p>}
      {error && <p role="alert" className="mt-3 flex items-center gap-2 text-xs text-rose-300"><AlertCircle className="size-4" />{error}</p>}
    </div>
  )
}
