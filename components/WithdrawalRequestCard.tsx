"use client"
import React, { useState } from 'react'
import { getContract, getSigner } from '@/lib/web3'
import { api } from '@/lib/api'

export default function WithdrawalRequestCard({ request }: { request: any }) {
  const [voting, setVoting] = useState(false)

  const status = request?.status
  const badgeClass = status === 'EXECUTED' ? 'bg-emerald-100 text-emerald-800' : status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'

  async function handleVote(approve: boolean) {
    try {
      setVoting(true)
      const contract = await getContract()
      const signer = await getSigner()
      const from = await signer?.getAddress()
      if (!from) throw new Error('Please connect your wallet')
      const onChainId = BigInt(request?.onChainId ?? request?.id)
      const tx = await contract.voteOnRequest(onChainId, approve)
      await tx.wait()
      // After a successful vote, re-fetch withdrawals for this campaign and notify listeners
      try {
        const refreshed = await api.get(`/campaigns/${request.campaignId}/withdrawals`).then(r => r.data)
        // Broadcast updated withdrawals so the page can refresh
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('withdrawalsUpdated', { detail: refreshed }))
        }
      } catch {
        // ignore
      }
      alert(`Vote submitted: ${approve ? 'Approve' : 'Reject'}`)
    } catch (err: any) {
      alert(err?.message || 'Vote failed')
    } finally {
      setVoting(false)
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="font-medium text-lg">{request?.purpose}</div>
          <div className="text-sm subtle">Amount: {request?.amount} ETH</div>
          <div className="text-sm subtle">Vendor: {request?.vendorAddress ?? '—'}</div>
          <div className="text-xs subtle mt-1">Submitted: {request?.createdAt ? new Date(request.createdAt).toLocaleString() : '—'}</div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className={`px-2 py-1 rounded-full text-xs ${badgeClass}`}>{status}</div>
          <div className="flex gap-2">
            {request?.financialProofUrl && (
              <a className="btn-ghost text-sm" target="_blank" rel="noreferrer" href={`http://localhost:8080/uploads/${request.financialProofUrl}`}>View Financial Proof</a>
            )}
            {request?.visualProofUrl && (
              <a className="btn-ghost text-sm" target="_blank" rel="noreferrer" href={`http://localhost:8080/uploads/${request.visualProofUrl}`}>View Visual Proof</a>
            )}
          </div>
          {status === 'PENDING_VOTE' && new Date(request?.votingDeadline) > new Date() && (
            <div className="flex gap-2">
              <button disabled={voting} onClick={() => handleVote(true)} className="btn bg-emerald-600 hover:bg-emerald-700 text-white">Approve</button>
              <button disabled={voting} onClick={() => handleVote(false)} className="btn bg-rose-600 hover:bg-rose-700 text-white">Reject</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
