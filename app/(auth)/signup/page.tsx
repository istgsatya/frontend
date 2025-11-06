"use client"
import { FormEvent, useState } from 'react'
import { api } from '@/lib/api'
import { motion } from 'framer-motion'

export default function SignupPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/signup', { username, email, password, confirmPassword })
      // Show success and clear form; do not touch auth store
      setSent(true)
      setUsername('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-md py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="card p-6">
        <h1 className="heading mb-6">Sign Up</h1>
        {!sent ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)} className="input transition-all focus:shadow-[0_0_0_4px_rgba(34,197,94,0.15)]" />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input transition-all focus:shadow-[0_0_0_4px_rgba(34,197,94,0.15)]" />
            </div>
            <div>
              <label className="block text-sm mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input transition-all focus:shadow-[0_0_0_4px_rgba(34,197,94,0.15)]" />
            </div>
            <div>
              <label className="block text-sm mb-1">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input transition-all focus:shadow-[0_0_0_4px_rgba(34,197,94,0.15)]" />
            </div>
            <button disabled={loading} className="btn-primary w-full disabled:opacity-50 transition-transform hover:-translate-y-0.5">{loading ? 'Creating...' : 'Create Account'}</button>
          </form>
        ) : (
          <div className="card bg-brand-50/60 border-brand-100 p-4">
            <p className="font-medium text-brand-800">Verification link sent!</p>
            <p className="text-sm text-gray-700">Please check the backend console for the verification token.</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
