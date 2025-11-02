"use client"
import { ReactNode, useEffect } from 'react'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { WalletRegistrationBanner } from './WalletRegistrationBanner'
import { useAuthStore } from '@/lib/store/auth'
import { usePathname } from 'next/navigation'
import { api } from '@/lib/api'

export function AppShell({ children }: { children: ReactNode }) {
  const isAuthed = useAuthStore(s => !!s.accessToken)
  const user = useAuthStore(s => s.user)
  const setUser = useAuthStore(s => s.setUser)
  const pathname = usePathname()

  const isAuthRoute = pathname?.startsWith('/login') || pathname?.startsWith('/signup') || pathname === '/account-verified'

  useEffect(() => {
    // On app load, if authenticated but no user loaded (e.g., fresh refresh), fetch it
    if (isAuthed && !user) {
      api.get('/auth/me').then(r => setUser(r.data)).catch(() => {})
    }
  }, [isAuthed, user, setUser])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {isAuthed && user && user.wallets && user.wallets.length === 0 && (
        <WalletRegistrationBanner />
      )}
      <div className="flex flex-1">
        {isAuthed && !isAuthRoute ? <Sidebar /> : null}
        <main className={`flex-1 ${isAuthed && !isAuthRoute ? 'p-6' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
