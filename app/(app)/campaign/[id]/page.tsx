"use client"
import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { useParams } from 'next/navigation'
import { fetchEthPrice, fiatToEth } from '@/lib/price'
import { getContract, getSigner } from '@/lib/web3'
import { parseEther } from 'ethers'

export default function CampaignDetail() {
  const params = useParams() as { id: string }
  const id = params?.id
  const [campaign, setCampaign] = useState<any>(null)
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [amountFiat, setAmountFiat] = useState('')
  const [price, setPrice] = useState<number>(0)
  const ethAmount = useMemo(() => fiatToEth(parseFloat(amountFiat || '0'), price), [amountFiat, price])

  useEffect(() => {
    (async () => {
      try {
        const [c, w] = await Promise.all([
          api.get(`/campaigns/${id}`).then(r => r.data),
          api.get(`/campaigns/${id}/withdrawals`).then(r => r.data)
        ])
        setCampaign(c)
        setWithdrawals(w)
      } finally {
        setLoading(false)
      }
    })()
    fetchEthPrice('inr').then(setPrice).catch(() => setPrice(0))
  }, [id])

  async function donate() {
    try {
      const contract = await getContract()
      if (!contract) throw new Error('Contract not configured')
  const onChainId = BigInt(campaign?.onChainId ?? campaign?.id)
  const signer = await getSigner()
  const donor = await signer?.getAddress()
  if (!donor) throw new Error('No wallet connected')
      const tx = await contract.recordDonation(onChainId, donor, 'CRYPTO', { value: parseEther(ethAmount.toString()) })
      const receipt = await tx.wait()
      // Notify backend to verify and persist the on-chain donation
      try {
        await api.post('/donations/crypto/verify', { transactionHash: tx.hash })
      } catch (e) {
        // Non-fatal: backend might be temporarily unavailable
      }
      alert('Donation recorded on-chain and verification sent to backend.')
    } catch (e: any) {
      alert(e?.message || 'Donation failed')
    }
  }

  async function vote(requestId: string, approve: boolean) {
    try {
      // Prefer backend endpoint which will orchestrate on-chain voting and handle eligibility
      await api.post(`/withdrawals/${requestId}/vote`, { approve })
      // Optionally refresh withdrawals
      const w = await api.get(`/campaigns/${id}/withdrawals`).then(r => r.data)
      setWithdrawals(w)
      alert(`Vote ${approve ? 'Approve' : 'Reject'} submitted.`)
    } catch (e: any) {
      alert(e?.message || 'Vote failed')
    }
  }

  if (loading) return <div className="container py-10">Loading...</div>
  if (!campaign) return <div className="container py-10">Not found.</div>

  return (
    <div className="container py-6 space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">{campaign.title}</h1>
        <p className="text-gray-700">{campaign.description}</p>
        <div className="text-sm text-gray-600">Goal: {campaign.goal}</div>
        <div className="rounded border p-4 mt-4 space-y-3">
          <div className="text-sm text-gray-700">Enter amount (INR)</div>
          <input value={amountFiat} onChange={e => setAmountFiat(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="1000" />
          <div className="text-sm text-gray-600">≈ {ethAmount.toFixed(6)} ETH</div>
          <button onClick={donate} className="px-4 py-2 rounded bg-brand-600 text-white hover:bg-brand-700">Donate</button>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Withdrawal History</h2>
        <div className="space-y-3">
          {withdrawals.map((w) => (
            <div key={w.id} className="border rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{w.purpose}</div>
                  <div className="text-sm text-gray-600">Amount: {w.amount}</div>
                  <div className="text-sm">Status: {w.status}</div>
                </div>
                {w.status === 'PENDING_VOTE' && new Date(w.votingDeadline) > new Date() && (
                  <div className="flex gap-2">
                    <button onClick={() => vote(w.id, true)} className="px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700">Approve</button>
                    <button onClick={() => vote(w.id, false)} className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700">Reject</button>
                  </div>
                )}
                {w.status === 'AWAITING_ADMIN_DECISION' && (
                  <div className="text-sm text-amber-700">Pending Admin Review</div>
                )}
              </div>
              <div className="mt-2 flex gap-4">
                {w.financialProofUrl && (
                  <a href={`http://localhost:8080/uploads/${w.financialProofUrl}`} target="_blank" className="text-sm text-brand-700 underline">Financial Proof</a>
                )}
                {w.visualProofUrl && (
                  <a href={`http://localhost:8080/uploads/${w.visualProofUrl}`} target="_blank" className="text-sm text-brand-700 underline">Visual Proof</a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
