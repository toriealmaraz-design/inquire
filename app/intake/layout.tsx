import type { ReactNode } from 'react'
import { IntakeProvider } from './provider'

export default function IntakeLayout({ children }: { children: ReactNode }) {
  return <IntakeProvider>{children}</IntakeProvider>
}
