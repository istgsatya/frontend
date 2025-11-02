"use client"
import { FormEvent, useState } from 'react'
import { api } from '@/lib/api'

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
      setSent(true)
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-md py-10">
      <h1 className="text-2xl font-semibold mb-6">Sign Up</h1>
      {!sent ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <button disabled={loading} className="w-full px-3 py-2 rounded bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50">{loading ? 'Creating...' : 'Create Account'}</button>
        </form>
      ) : (
        <div className="rounded border p-4 bg-green-50">
          <p className="font-medium">Verification link sent!</p>
          <p className="text-sm text-gray-600">Please check the backend console for the verification token.</p>
        </div>
      )}
    </div>
  )
}
