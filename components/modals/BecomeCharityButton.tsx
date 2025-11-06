"use client"
import { useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth'

export function BecomeCharityButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} className="w-full btn-primary">Register Your Charity</button>
      {open && <BecomeCharityModal onClose={() => setOpen(false)} />}
    </>
  )
}

function BecomeCharityModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const accessToken = useAuthStore(s => s.accessToken)

  async function submit() {
    setLoading(true)
    try {
      const fd = new FormData()
      // Spring backend expects a JSON part named 'application'
      const application = { name, description }
      fd.append('application', new Blob([JSON.stringify(application)], { type: 'application/json' }))
      if (file) fd.append('document', file)
      // Explicitly include Authorization for multipart request
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
