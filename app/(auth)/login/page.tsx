"use client"
import { FormEvent, useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth'
import { useRouter } from 'next/navigation'
import { getSigner } from '@/lib/web3'

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore(s => s.login)
  const router = useRouter()
  const [address, setAddress] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/auth/signin', { usernameOrEmail, password })
      const { accessToken, user } = res.data
      login(accessToken, user)
      router.replace('/')
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function connectMetaMask() {
    try {
      const signer = await getSigner()
      const addr = await signer?.getAddress()
      setAddress(addr || null)
    } catch (e: any) {
      alert(e?.message || 'Failed to connect wallet')
    }
  }

  return (
    <div className="container max-w-md py-10">
      <h1 className="text-2xl font-semibold mb-6">Login</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Username or Email</label>
          <input value={usernameOrEmail} onChange={e => setUsernameOrEmail(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <button disabled={loading} className="w-full px-3 py-2 rounded bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50">{loading ? 'Logging in...' : 'Login'}</button>
      </form>

      <div className="mt-6 border-t pt-6">
        <button onClick={connectMetaMask} className="w-full px-3 py-2 rounded border">Connect with MetaMask</button>
        {address && <p className="text-sm text-gray-600 mt-2">Connected: {address}</p>}
      </div>
    </div>
  )
}
