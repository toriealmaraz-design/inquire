import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ChatbotWidget } from '@/components/chatbot-widget'
import { BrandingProvider } from '@/components/branding'
import { getBranding } from '@/lib/branding'

const staticIcons: Metadata['icons'] = {
  icon: [
    { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
    { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
    { url: '/icon.svg', type: 'image/svg+xml' },
  ],
  apple: '/apple-icon.png',
}

export async function generateMetadata(): Promise<Metadata> {
  const { faviconUrl } = await getBranding()
  return {
    title: 'Gemini Nexus | Academic & Technical Solutions',
    description: 'Precision academic reports, software development, web systems, and technical research solutions.',
    generator: 'v0.app',
    manifest: '/manifest.webmanifest',
    // Use the uploaded favicon when the super admin has set one; otherwise the built-in icons.
    icons: faviconUrl ? { icon: faviconUrl, apple: faviconUrl } : staticIcons,
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { logoUrl } = await getBranding()
  return (
    <html lang="en">
      <body className="antialiased">
        <BrandingProvider logoUrl={logoUrl}>
          {children}
          <ChatbotWidget />
        </BrandingProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
