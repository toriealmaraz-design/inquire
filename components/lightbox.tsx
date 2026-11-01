'use client'

import { useEffect } from 'react'
import { X, Download } from 'lucide-react'

/** Full-screen image viewer (tap a chat image to open). */
export function Lightbox({ url, name, onClose }: { url: string | null; name?: string; onClose: () => void }) {
  useEffect(() => {
    if (!url) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [url, onClose])

  if (!url) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4" onClick={onClose} role="dialog" aria-label="Image viewer">
      <div className="absolute right-4 top-4 flex gap-2">
        <a href={url} download target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} aria-label="Download image" className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><Download className="size-5" /></a>
        <button onClick={onClose} aria-label="Close" className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="size-5" /></button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={name || ''} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] max-w-full rounded-lg object-contain" />
    </div>
  )
}
