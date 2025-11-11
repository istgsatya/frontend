"use client"
import React, { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { formatEth } from '@/lib/format'

export default function RequestWithdrawalModal({ open, onClose, campaignId, availableBalance, onSuccess }: { open: boolean, onClose: () => void, campaignId: any, availableBalance: number, onSuccess?: () => void }) {
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const [vendorAddress, setVendorAddress] = useState('')
  const [financialFile, setFinancialFile] = useState<File | null>(null)
  const [visualFile, setVisualFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amountError, setAmountError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setAmount('')
      setPurpose('')
      setVendorAddress('')
      setFinancialFile(null)
      setVisualFile(null)
      setError(null)
      setAmountError(null)
    }
  }, [open])

  if (!open) return null

  const max = Number(availableBalance || 0)
  const numericAmount = Number(amount || 0)
  // Real-time validation: do not allow requesting more than availableBalance
  useEffect(() => {
    if (!amount) { setAmountError(null); return }
    const n = Number(amount)
    if (isNaN(n) || n <= 0) {
      setAmountError('Enter a valid amount')
    } else if (n > max) {
      setAmountError('Cannot request more than available funds')
    } else {
      setAmountError(null)
    }
  }, [amount, max])

  const valid = !amountError && numericAmount > 0 && numericAmount <= max && purpose.trim().length > 5 && /^0x[a-fA-F0-9]{40}$/.test(vendorAddress) && financialFile && visualFile

  function showToast(message: string, success = true) {
    try {
      const el = document.createElement('div')
      el.textContent = message
      el.style.position = 'fixed'
      el.style.right = '20px'
      el.style.top = '20px'
      el.style.padding = '12px 16px'
      el.style.background = success ? '#064e3b' : '#7f1d1d'
      el.style.color = 'white'
      el.style.borderRadius = '8px'
      el.style.zIndex = '999999'
      document.body.appendChild(el)
      setTimeout(() => { try { el.style.transition = 'opacity 0.3s'; el.style.opacity = '0' } catch {} }, 2600)
      setTimeout(() => { try { el.remove() } catch {} }, 3000)
    } catch {}
  }

  async function submit() {
    setError(null)
    if (!valid) {
      setError('Please complete the form and ensure the amount is valid and files are attached.')
      return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      const payload = {
        campaignId,
        amount: String(amount),
        purpose,
        vendorAddress
      }
      fd.append('request', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
      fd.append('financialProof', financialFile as File)
      fd.append('visualProof', visualFile as File)

      await api.post('/withdrawals', fd)
      // Close modal first, then trigger parent success handler which should refresh data
      try { onClose() } catch {}
      try { onSuccess && onSuccess() } catch {}
      // Show a prominent success toast
      showToast('Withdrawal Request created successfully! It is now live for donor voting.', true)
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to submit request'
      try { onClose() } catch {}
      showToast(msg, false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center p-4">
      <div className="card w-full max-w-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Request Withdrawal</h3>
        <div className="text-sm subtle">Available: {formatEth(max)}</div>

        <div>
          <label className="block text-sm mb-1">Amount (ETH)</label>
          <input value={amount} onChange={e => setAmount(e.target.value)} className={`input ${amountError ? 'border-red-500' : ''}`} placeholder="0.5" />
          {amountError && <div className="text-sm text-red-500 mt-1">{amountError}</div>}
        </div>

        <div>
          <label className="block text-sm mb-1">Purpose</label>
          <textarea value={purpose} onChange={e => setPurpose(e.target.value)} className="input" rows={3} />
        </div>

        <div>
          <label className="block text-sm mb-1">Vendor / Recipient Address (0x...)</label>
          <input value={vendorAddress} onChange={e => setVendorAddress(e.target.value)} className="input" placeholder="0x..." />
        </div>

        <div>
          <label className="block text-sm mb-1">Upload Financial Proof (Invoice)</label>
          <input type="file" onChange={e => setFinancialFile(e.target.files?.[0] ?? null)} className="block text-sm" />
        </div>

        <div>
          <label className="block text-sm mb-1">Upload Visual Proof (Photo)</label>
          <input type="file" onChange={e => setVisualFile(e.target.files?.[0] ?? null)} className="block text-sm" />
        </div>

        {error && <div className="text-sm text-red-500">{error}</div>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={submit} disabled={!valid || loading} className="btn-primary disabled:opacity-60">{loading ? 'Submitting...' : 'Submit for Voting'}</button>
        </div>
      </div>
    </div>
  )
}
