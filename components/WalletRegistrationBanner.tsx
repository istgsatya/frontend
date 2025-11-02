"use client"
import { useAuthStore } from '@/lib/store/auth'
import { getSigner } from '@/lib/web3'
import { api } from '@/lib/api'

export function WalletRegistrationBanner() {
  const user = useAuthStore(s => s.user)
  const setUser = useAuthStore(s => s.setUser)

  async function registerWallet() {
    try {
      const signer = await getSigner()
      if (!signer) throw new Error('MetaMask not available')
      const address = await signer.getAddress()
      await api.post('/wallets/register', { address })
      // refresh user from backend
      const { data } = await api.get('/auth/me')
      setUser(data)
    } catch (e: any) {
      alert(e?.message || 'Failed to register wallet')
    }
  }

  if (!user) return null

  if (user.wallets && user.wallets.length > 0) return null

  return (
    <div className="bg-yellow-50 text-yellow-900 border-b border-yellow-200">
      <div className="container py-2 flex items-center justify-between gap-3">
        <p className="text-sm">To participate in donations and governance, you must register a wallet.</p>
        <button onClick={registerWallet} className="text-sm px-3 py-1.5 rounded bg-yellow-600 text-white hover:bg-yellow-700">Register Wallet</button>
      </div>
    </div>
  )
}
