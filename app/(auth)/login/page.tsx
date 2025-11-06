"use client"
import { FormEvent, useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore(s => s.login)
  const setAccessToken = useAuthStore(s => s.setAccessToken)
  const setUser = useAuthStore(s => s.setUser)
  const router = useRouter()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
  const res = await api.post('/auth/signin', { usernameOrEmail, password })
  const { accessToken, user } = res.data
  // Persist token first, then user, then navigate
  setAccessToken(accessToken)
  setUser(user)
  // Also call combined helper for completeness
  login(accessToken, user)
  router.replace('/')
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-md py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="card p-6">
        <h1 className="heading mb-6">Login</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Username or Email</label>
            <input value={usernameOrEmail} onChange={e => setUsernameOrEmail(e.target.value)} className="input transition-all focus:shadow-[0_0_0_4px_rgba(34,197,94,0.15)]" />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input transition-all focus:shadow-[0_0_0_4px_rgba(34,197,94,0.15)]" />
          </div>
          <button disabled={loading} className="btn-primary w-full disabled:opacity-50 transition-transform hover:-translate-y-0.5">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
