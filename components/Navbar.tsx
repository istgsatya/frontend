"use client"
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/auth'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getProvider, ensureSepolia } from '@/lib/web3'

export function Navbar() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const user = useAuthStore(s => s.user)
  const setUser = useAuthStore(s => s.setUser)
  const logout = useAuthStore(s => s.logout)
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  // Start listening for provider account changes and detect initial address
  useDetectConnectedAddress(setConnectedAddress)

  return (
    <header className="sticky top-0 z-40">
      <div className="border-b border-white/30 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-white/10 dark:bg-slate-900/70 supports-[backdrop-filter]:dark:bg-slate-900/60">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="font-semibold text-lg tracking-tight text-slate-900 dark:text-slate-100">
            <span className="bg-gradient-to-r from-brand-600 to-emerald-500 bg-clip-text text-transparent">Transparent Cents</span>
          </Link>
          <nav className="relative flex items-center gap-3">
            {/* Connected wallet indicator */}
            {typeof window !== 'undefined' && (
              <div className="hidden sm:flex items-center gap-3 mr-2">
                {connectedAddress ? (
                  <div className="flex items-center gap-2 bg-black/5 dark:bg-white/10 px-3 py-1 rounded text-sm text-slate-700 dark:text-slate-200">
                    <span className="font-mono">{`${connectedAddress.slice(0,6)}...${connectedAddress.slice(-4)}`}</span>
                    <button
                      onClick={async () => {
                        setConnecting(true)
                        try {
                          const eth = (window as any).ethereum
                          if (!eth) throw new Error('No wallet available')
                          try {
                            await eth.request?.({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] })
                          } catch {}
                          // @ts-ignore
                          const accounts = await eth.request?.({ method: 'eth_requestAccounts' })
                          const addr = accounts?.[0]
                          setConnectedAddress(addr ?? null)
                          // Try to switch to Sepolia automatically
                          try {
                            const provider = getProvider()
                            if (provider) await ensureSepolia(provider)
                          } catch (e: any) {
                            // If switching fails, surface a friendly alert once
                            if (typeof window !== 'undefined') alert(e?.message || 'Please switch your wallet network to Sepolia testnet')
                          }
                          // Refresh user info if authenticated
                          if (isAuthenticated) {
                            try {
                              const res = await api.get('/auth/me')
                              setUser(res.data)
                            } catch {}
                          }
                        } catch (e) {
                          // ignore
                        } finally {
                          setConnecting(false)
                        }
                      }}
                      className="btn-ghost text-xs ml-1"
                      disabled={connecting}
                    >
                      {connecting ? 'Connecting…' : 'Reconnect'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      setConnecting(true)
                      try {
                        const eth = (window as any).ethereum
                        if (!eth) throw new Error('No wallet available')
                        try {
                          await eth.request?.({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] })
                        } catch {}
                        // @ts-ignore
                        const accounts = await eth.request?.({ method: 'eth_requestAccounts' })
                        const addr = accounts?.[0]
                        setConnectedAddress(addr ?? null)
                        try {
                          const provider = getProvider()
                          if (provider) await ensureSepolia(provider)
                        } catch (e: any) {
                          if (typeof window !== 'undefined') alert(e?.message || 'Please switch your wallet network to Sepolia testnet')
                        }
                        if (isAuthenticated) {
                          try {
                            const res = await api.get('/auth/me')
                            setUser(res.data)
                          } catch {}
                        }
                      } catch (e) {
                        // ignore
                      } finally {
                        setConnecting(false)
                      }
                    }}
                    className="btn-ghost text-xs"
                    disabled={connecting}
                  >
                    {connecting ? 'Connecting…' : 'Connect Wallet'}
                  </button>
                )}
              </div>
            )}

            {!isAuthenticated ? (
              <>
                <Link href="/login" className="btn-ghost text-slate-700 dark:text-slate-200">Login</Link>
                <Link href="/signup" className="btn-primary">Sign Up</Link>
              </>
            ) : (
              <div className="relative">
                <button onClick={() => setOpen(v => !v)} className="btn-ghost">
                  {user?.username}
                  <span className="ml-1">▾</span>
                </button>
                {open && (
                  <div className="absolute right-0 mt-2 w-48 card p-2 z-50">
                    <Link href="/my-account" className="block px-3 py-2 rounded hover:bg-black/5 dark:hover:bg-white/10" onClick={() => setOpen(false)}>My Account</Link>
                    <button onClick={() => { setOpen(false); logout(); router.replace('/login') }} className="w-full text-left px-3 py-2 rounded hover:bg-black/5 dark:hover:bg-white/10">Logout</button>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}

// Probe for connected address and listen for account changes
function useDetectConnectedAddress(setConnectedAddress: (a: string | null) => void) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const eth = (window as any).ethereum
    if (!eth) return
    let mounted = true
    const update = async () => {
      try {
        // Try eth_accounts to avoid prompting UI
        // @ts-ignore
        const accounts = await eth.request?.({ method: 'eth_accounts' }) || []
        if (!mounted) return
        setConnectedAddress(accounts[0] ?? null)
      } catch {
        try {
          // fallback to provider.listAccounts
          const provider = getProvider()
          // @ts-ignore
          const list = provider ? await provider.listAccounts() : []
          if (!mounted) return
          // list may be array of Signer-like objects or addresses
          const addr = Array.isArray(list) && list.length ? (typeof list[0] === 'string' ? list[0] : list[0]?.address ?? null) : null
          setConnectedAddress(addr)
        } catch {
          if (!mounted) return
          setConnectedAddress(null)
        }
      }
    }
    update()
    const onAccountsChanged = (accounts: any) => setConnectedAddress(accounts?.[0] ?? null)
    try {
      eth.on?.('accountsChanged', onAccountsChanged)
      eth.on?.('connect', update)
      eth.on?.('disconnect', () => setConnectedAddress(null))
    } catch {}
    return () => {
      mounted = false
      try {
        eth.removeListener?.('accountsChanged', onAccountsChanged)
        eth.removeListener?.('connect', update)
        eth.removeListener?.('disconnect', () => setConnectedAddress(null))
      } catch {}
    }
  }, [setConnectedAddress])
}
