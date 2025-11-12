"use client"
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Wallet = { address: string; createdAt?: string }
export type User = {
  id: number
  username: string
  email?: string
  roles: string[]
  wallets: Wallet[]
}

type AuthState = {
  accessToken: string | null
  user: User | null
  isAuthenticated: boolean
  authLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  setUser: (user: User | null) => void
  setAccessToken: (token: string | null) => void
  setAuthLoading: (loading: boolean) => void
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  // Start true until AuthProvider finishes initial /auth/me check
  authLoading: true,
      login: (token, user) => set({ accessToken: token, user, isAuthenticated: true }),
      logout: () => set({ accessToken: null, user: null, isAuthenticated: false }),
      setUser: (user) => set({ user }),
      setAccessToken: (token) => set({ accessToken: token, isAuthenticated: !!token }),
  setAuthLoading: (loading) => set({ authLoading: loading }),
  setAuth: (token, user) => set({ accessToken: token, user, isAuthenticated: true }),
  clearAuth: () => set({ accessToken: null, user: null, isAuthenticated: false })
    }),
    { name: 'tc-auth' }
  )
)
