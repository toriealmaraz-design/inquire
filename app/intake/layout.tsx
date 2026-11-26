import type { ReactNode } from 'react'
import { ConnectionBanner } from '@/components/intake/connection-banner'
import { IntakeProvider } from './provider'

export default function IntakeLayout({ children }: { children: ReactNode }) {
  return <IntakeProvider><ConnectionBanner />{children}</IntakeProvider>
}
