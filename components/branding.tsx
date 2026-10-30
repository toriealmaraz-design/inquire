'use client'

import { createContext, useContext } from 'react'

const FALLBACK_LOGO =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Gemini_Generated_Image_%20%283%29-PQcynfUuZ8MCE6lPljaeCegmfntVMi.png'

const BrandingContext = createContext<{ logoUrl: string }>({ logoUrl: FALLBACK_LOGO })

/** Wrap the app with the server-provided logo URL so client headers render it without a fetch. */
export function BrandingProvider({ logoUrl, children }: { logoUrl: string; children: React.ReactNode }) {
  return <BrandingContext.Provider value={{ logoUrl: logoUrl || FALLBACK_LOGO }}>{children}</BrandingContext.Provider>
}

export function useLogoUrl() {
  return useContext(BrandingContext).logoUrl
}

/** The site logo <img>, sourced from the uploaded Settings logo (or the built-in fallback). */
export function BrandLogo({ className, alt = 'Gemini Nexus', width, height }: { className?: string; alt?: string; width?: number; height?: number }) {
  const logoUrl = useLogoUrl()
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={logoUrl} alt={alt} width={width} height={height} className={className} />
}
