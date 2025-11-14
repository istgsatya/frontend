import './globals.css'
import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { AppShell } from '@/components/AppShell'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/components/AuthProvider'
import ThemeProvider from '@/components/ThemeProvider'
import ToastProvider from '@/components/ToastProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Transparent Cents',
  description: 'Instagram for Social Good'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen antialiased`}> 
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <AppShell>
                {children}
              </AppShell>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
