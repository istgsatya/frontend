"use client"
import { ReactNode, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const setAccessToken = useAuthStore(s => s.setAccessToken)
  const login = useAuthStore(s => s.login)
  const setAuthLoading = useAuthStore(s => s.setAuthLoading)
  const logout = useAuthStore(s => s.logout)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        // Read token from persisted storage directly to avoid hydration races
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem('tc-auth') : null
        const persisted = raw ? JSON.parse(raw) : null
        const token: string | null = persisted?.state?.accessToken || null

        if (!token) {
          // No token: ensure clean state and render immediately
          if (!cancelled) {
            setAccessToken(null)
            setAuthLoading(false)
            setReady(true)
          }
          return
        }

        // Token present: set loading and try to hydrate user
        setAuthLoading(true)
        setAccessToken(token)
        try {
          const { data } = await api.get('/auth/me')
          if (!cancelled) {
            // Normalize backend user shape so UI role/wallet checks are reliable
            const normalized = { ...data } as any
            if (!Array.isArray(normalized.roles)) {
              if (typeof normalized.roles === 'string' && normalized.roles.length > 0) {
                // backend may return comma-separated roles
                normalized.roles = normalized.roles.split(',').map((r: string) => r.trim())
              } else {
                normalized.roles = []
              }
            }
            if (!Array.isArray(normalized.wallets)) {
              normalized.wallets = []
            }

            // Hydrate full auth state in one go with normalized user
            login(token, normalized)
          }
        } catch (e) {
          // Token invalid or backend rejected: clear everything
          if (typeof window !== 'undefined') {
            try { window.localStorage.removeItem('tc-auth') } catch {}
          }
          logout()
        } finally {
          if (!cancelled) {
            setAuthLoading(false)
            setReady(true)
          }
        }
      } catch {
        // Fallback: render anyway
        if (!cancelled) {
          setAuthLoading(false)
          setReady(true)
        }
      }
    }

    bootstrap()
    return () => { cancelled = true }
  }, [setAccessToken, setAuthLoading, login, logout])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="subtle">Initializing…</div>
      </div>
    )
  }

  return <>{children}</>
}
