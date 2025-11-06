"use client"
import { ReactNode } from 'react'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { WalletPromptBanner } from './WalletPromptBanner'
import { Footer } from './Footer'
import { useAuthStore } from '@/lib/store/auth'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'

export function AppShell({ children }: { children: ReactNode }) {
  const isAuthed = useAuthStore(s => s.isAuthenticated)
  const user = useAuthStore(s => s.user)
  const pathname = usePathname()

  const isAuthRoute = pathname?.startsWith('/login') || pathname?.startsWith('/signup') || pathname === '/account-verified'

  const isLanding = pathname === '/'
  const hideFooter = isLanding || pathname?.startsWith('/login') || pathname?.startsWith('/signup')

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {/* Show wallet prompt when user is authed and either has an empty wallets array or the backend didn't include wallets */}
      {isAuthed && user && (!Array.isArray(user.wallets) || user.wallets.length === 0) && !isAuthRoute ? (
        <WalletPromptBanner />
      ) : null}
      <div className="flex flex-1">
        {isAuthed && !isAuthRoute ? <Sidebar /> : null}
        <main className={`flex-1 ${isAuthed && !isAuthRoute ? 'p-6' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="container max-w-7xl"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {!hideFooter && <Footer />}
    </div>
  )
}
