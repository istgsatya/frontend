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
    <div className="container pt-3">
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-brand-200/60">
        <p className="text-sm text-slate-800">
          To participate in donations and governance, please register a wallet.
        </p>
        <button onClick={registerWallet} className="btn-primary">Register Wallet</button>
      </div>
    </div>
  )
}
