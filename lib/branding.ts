import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'

// The built-in logo used until the super admin uploads one in Settings.
export const FALLBACK_LOGO =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Gemini_Generated_Image_%20%283%29-PQcynfUuZ8MCE6lPljaeCegmfntVMi.png'

export type Branding = { logoUrl: string; faviconUrl: string | null }

/** Server-side: the uploaded logo/favicon URLs saved in Settings (with a logo fallback). */
export async function getBranding(): Promise<Branding> {
  try {
    const [row] = await db
      .select({ logoUrl: settings.logoUrl, faviconUrl: settings.faviconUrl })
      .from(settings)
      .where(eq(settings.id, 1))
      .limit(1)
    return {
      logoUrl: row?.logoUrl?.trim() || FALLBACK_LOGO,
      faviconUrl: row?.faviconUrl?.trim() || null,
    }
  } catch {
    return { logoUrl: FALLBACK_LOGO, faviconUrl: null }
  }
}
