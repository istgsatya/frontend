  "use client"
  import { useState } from 'react'
  import { api } from '@/lib/api'
  import { useAuthStore } from '@/lib/store/auth'
  import { ethers } from 'ethers'

  export function BecomeCharityButton() {
    const [openApply, setOpenApply] = useState(false)
    const [openWalletRequired, setOpenWalletRequired] = useState(false)
    const user = useAuthStore(s => s.user)

    function handleClick() {
      const hasWallet = !!(user && Array.isArray(user.wallets) && user.wallets.length > 0)
      if (hasWallet) setOpenApply(true)
      else setOpenWalletRequired(true)
    }

    return (
      <>
        <button onClick={handleClick} className="w-full btn-primary">Register Your Charity</button>
        {openApply && <BecomeCharityModal onClose={() => setOpenApply(false)} />}
        {openWalletRequired && <WalletRequiredModal onClose={() => setOpenWalletRequired(false)} />}
      </>
    )
  }

  function BecomeCharityModal({ onClose }: { onClose: () => void }) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const accessToken = useAuthStore(s => s.accessToken)
    const user = useAuthStore(s => s.user)

    async function submit() {
      setLoading(true)
      try {
        const registered = Array.isArray(user?.wallets) && user!.wallets.length > 0
        if (!registered) {
          throw new Error('You must connect and register a wallet before registering a charity.')
        }

        const fd = new FormData()
        const application: any = { name, description }
        const payout = (user as any).wallets?.[0]?.address
        if (payout) application.payoutWalletAddress = payout
        fd.append('application', new Blob([JSON.stringify(application)], { type: 'application/json' }))
        if (file) fd.append('document', file)

        await api.post('/charities/apply', fd, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
        })
        alert('Application submitted!')
        onClose()
      } catch (e: any) {
        const msg = e?.response?.status === 403 && e?.response?.data?.message
          ? e.response.data.message
          : (e?.message || 'Failed to submit')
        alert(msg)
      } finally {
        setLoading(false)
      }
    }

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="card w-full max-w-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Become a Charity</h2>
          <div className="space-y-2">
            <label className="block text-sm">Charity Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="input" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="input" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm">Registration Document</label>
            <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} className="block text-sm" />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={submit} disabled={loading} className="btn-primary disabled:opacity-50">{loading ? 'Submitting...' : 'Submit'}</button>
          </div>
        </div>
      </div>
    )
  }

  function WalletRequiredModal({ onClose }: { onClose: () => void }) {
    const [loading, setLoading] = useState(false)
    const setUser = useAuthStore(s => s.setUser)

    async function registerWallet() {
      setLoading(true)
      try {
        const eth = (window as any).ethereum
        if (!eth) throw new Error('MetaMask is not installed.')

        try {
          await eth.request?.({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] })
        } catch {}

        const provider = new ethers.BrowserProvider(eth)
        let accounts: string[] = []
        try {
          // @ts-ignore
          accounts = await provider.send('eth_accounts', [])
        } catch {
          try {
            // @ts-ignore
            accounts = await provider.listAccounts()
          } catch {}
        }
        if (!accounts || accounts.length === 0) {
          try { await eth.request?.({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] }) } catch {}
          // @ts-ignore
          accounts = await provider.send('eth_requestAccounts', [])
        }
        const userAddress = accounts?.[0]
        if (!userAddress) throw new Error('No wallet address returned.')

        const confirmed = typeof window !== 'undefined'
          ? window.confirm(`Connect this wallet to Transparent Cents?\\n\\n${userAddress}`)
          : true
        if (!confirmed) return

        await api.post('/wallets/register', { address: userAddress })
        const { data } = await api.get('/auth/me')
        setUser(data)
        if (typeof window !== 'undefined') alert('Wallet Registered! You can now apply to register a charity.')
        onClose()
      } catch (e: any) {
        const backendMsg = e?.response?.data?.message
        const msg = backendMsg || e?.message || 'Failed to register wallet'
        if (typeof window !== 'undefined') alert(msg)
      } finally {
        setLoading(false)
      }
    }

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="card w-full max-w-md p-6 space-y-4">
          <h2 className="text-xl font-semibold">Connect a Wallet</h2>
          <p className="subtle">To register a charity, you must first connect and register a primary crypto wallet. This wallet will be associated with your charity for withdrawals and accountability.</p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={registerWallet} disabled={loading} className="btn-primary">{loading ? 'Connecting…' : 'Connect Wallet'}</button>
          </div>
        </div>
      </div>
    )
  }

  export default BecomeCharityButton
