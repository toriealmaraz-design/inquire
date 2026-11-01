import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ChatbotWidget } from '@/components/chatbot-widget'
import { BrandingProvider } from '@/components/branding'
import { getBranding } from '@/lib/branding'

const staticIcons: Metadata['icons'] = {
  icon: [
    { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
    { url: '/brand/favicon-32.png', type: 'image/png', sizes: '32x32' },
    { url: '/brand/favicon.png', type: 'image/png', sizes: '64x64' },
  ],
  apple: '/brand/apple-icon.png',
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
