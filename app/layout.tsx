import './globals.css'
import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { AppShell } from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'Transparent Cents',
  description: 'Instagram for Social Good'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  )
}
