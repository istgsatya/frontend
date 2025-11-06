"use client"
import { useState } from 'react'
import { useAuthStore } from '@/lib/store/auth'
import { api } from '@/lib/api'
import { ethers } from 'ethers'

export function WalletPromptBanner() {
  const user = useAuthStore(s => s.user)
  const isAuthed = useAuthStore(s => !!s.accessToken)
  const setUser = useAuthStore(s => s.setUser)
  const login = useAuthStore(s => s.login)
  const accessToken = useAuthStore(s => s.accessToken)
  const [loading, setLoading] = useState(false)

  if (!isAuthed || !user) return null
  if (Array.isArray(user.wallets) && user.wallets.length > 0) return null

  async function registerWallet() {
    setLoading(true)
    try {
      const eth = (window as any).ethereum
      if (!eth) throw new Error('MetaMask is not installed.')

      // Try to open the account selection UI so users can choose a different account if needed
      try {
        await eth.request?.({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        })
      } catch {
        // Some wallets don’t support wallet_requestPermissions; fall back to eth_requestAccounts
      }

      const provider = new ethers.BrowserProvider(eth)
      // Check existing connected accounts first to avoid re-prompting the user
      let accounts: string[] = []
      try {
        // list already-connected accounts without prompting the wallet UI
        // provider.send('eth_accounts') returns a list of addresses
        // @ts-ignore
        accounts = await provider.send('eth_accounts', [])
      } catch {
        try {
          // Fallback for implementations where provider.send isn't available
          // @ts-ignore
          accounts = await provider.listAccounts()
        } catch {
          // ignore and fall back to explicit request below
        }
      }
      if (!accounts || accounts.length === 0) {
        // Try to open the account selection UI so users can choose a different account if needed
        try {
          await eth.request?.({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }]
          })
        } catch {
          // Some wallets don’t support wallet_requestPermissions; fall back to eth_requestAccounts
        }
        const requested: string[] = await provider.send('eth_requestAccounts', [])
        accounts = requested
      }
      const userAddress = accounts?.[0]
      if (!userAddress) throw new Error('No wallet address returned.')

      // Ask user to confirm the exact address being connected
      const confirmed = typeof window !== 'undefined'
        ? window.confirm(`Connect this wallet to Transparent Cents?\n\n${userAddress}`)
        : true
      if (!confirmed) {
        setLoading(false)
        return
      }

      await api.post('/wallets/register', { address: userAddress })
      const { data } = await api.get('/auth/me')
      setUser(data)
      if (accessToken) {
        // Reaffirm auth with fresh user per handbook; token remains the same
        login(accessToken, data)
      }

      // Success feedback
      if (typeof window !== 'undefined') {
        alert('Wallet Registered!')
      }
    } catch (error: any) {
      const backendMsg = error?.response?.data?.message
      const msg = backendMsg || error?.message || 'Failed to register wallet'
      if (typeof window !== 'undefined') {
        alert(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container pt-3">
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-brand-200/60">
        <p className="text-sm text-slate-800">
          To participate in donations and governance, you must register a crypto wallet.
        </p>
        <button
          onClick={registerWallet}
          disabled={loading}
          className="btn-primary disabled:opacity-60 inline-flex items-center gap-2"
        >
          {loading && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          Register Wallet
        </button>
      </div>
    </div>
  )
}
