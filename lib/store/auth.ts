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
  login: (token: string, user: User) => void
  logout: () => void
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      login: (token, user) => set({ accessToken: token, user }),
      logout: () => set({ accessToken: null, user: null }),
      setUser: (user) => set({ user })
    }),
    { name: 'tc-auth' }
  )
)
