"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { getContract, getSigner } from '@/lib/web3'
import { api } from '@/lib/api'
import useCountdown from '@/lib/hooks/useCountdown'
import useOnChainVoteData from '@/lib/hooks/useOnChainVoteData'
import { useAuthStore } from '@/lib/store/auth'
import { getReadOnlyContract } from '@/lib/web3'
import { formatINR, formatEth } from '@/lib/format'
import { useEthPrice } from './EthPriceProvider'

interface VoteCounts { for: string; against: string }

export default function WithdrawalRequestCard({ request }: { request: any }) {
  const [voting, setVoting] = useState(false)
  const [hasAlreadyVoted, setHasAlreadyVoted] = useState<boolean>(false)
  const [isEligibleVoter, setIsEligibleVoter] = useState<boolean>(false)
  const [deadlineMs, setDeadlineMs] = useState<number>(0)
  const { user, isAuthenticated } = useAuthStore()

  // Resolve on-chain request id
  const onChainRequestId = request?.onChainRequestId ?? request?.onChainId ?? request?.id

  // Fetch on-chain vote data via SWR polling (every 5s) and set deadline
  const { data: onChainData, isLoading: isLoadingVoteCount, mutate: mutateOnChain } = useOnChainVoteData(onChainRequestId)
  useEffect(() => {
    if (!onChainData) return
    const sec = Number(onChainData.votingDeadline ?? 0)
    if (sec) setDeadlineMs(sec * 1000)
  }, [onChainData])

  // ETH->INR price from context (cached and refreshed periodically)
  const { price: ethPriceInInr, error: priceError } = useEthPrice()

  // Dedicated, faster polling for active votes: every 4s while pending
  useEffect(() => {
    let iv: any
    let cancelled = false
    const run = async () => { try { await mutateOnChain() } catch {} }
    if (request?.status === 'PENDING_VOTE') {
      run()
      iv = setInterval(() => { if (!cancelled) run() }, 4000)
    }
    return () => { cancelled = true; if (iv) clearInterval(iv) }
  }, [request?.status, mutateOnChain])

  // Eligibility: check once when card mounts.
  // New policy: campaignContributions on-chain is unreliable; use backend proof-of-donation.
  useEffect(() => {
    const checkEligibility = async () => {
      try {
        const currentUserAddress = (useAuthStore as any).getState()?.user?.wallets?.[0]?.address
        if (!isAuthenticated || !currentUserAddress) {
          // Not logged in or no wallet registered
          setIsEligibleVoter(false)
          setHasAlreadyVoted(false)
          return
        }

        // 1) Check on-chain whether the user has already voted (read-only, no wallet prompt)
        let hasVotedResult = false
        try {
          const contract = await getReadOnlyContract()
          const reqId = BigInt(onChainRequestId ?? request?.id ?? 0)
          hasVotedResult = !!(await contract.hasVoted(reqId, currentUserAddress))
        } catch {
          hasVotedResult = false
        }
        setHasAlreadyVoted(!!hasVotedResult)

        // 2) Ask our backend whether the logged-in user has a verified donation for this campaign
        const campaignIdForCall = request?.campaign?.id ?? request?.campaignId ?? 0
        try {
          const res = await api.get(`/donations/has-donated/${campaignIdForCall}`)
          const hasDonated = !!res?.data
          setIsEligibleVoter(hasDonated)
        } catch {
          // If backend check fails, conservatively mark as ineligible
          setIsEligibleVoter(false)
        }
      } catch (err) {
        // Any unexpected error -> conservative defaults
        setIsEligibleVoter(false)
        setHasAlreadyVoted(false)
      }
    }
    checkEligibility()
  }, [onChainRequestId, request?.campaign, request?.campaignId, request?.id, isAuthenticated])

  // Countdown hook based on deadlineMs; fallback to request.votingDeadline if deadlineMs not set
  const rawDeadline = deadlineMs || (request?.votingDeadline ? new Date(request.votingDeadline).getTime() : 0)
  const timeLeft = useCountdown(rawDeadline)

  async function handleVote(approve: boolean) {
    try {
      setVoting(true)
      const contract = await getContract()
      const signer = await getSigner()
      const from = await signer?.getAddress()
      if (!from) throw new Error('Please connect your wallet')
      const reqIdBig = BigInt(onChainRequestId)
      const tx = await contract.voteOnRequest(reqIdBig, approve)
      await tx.wait()
      // Refresh on-chain vote data
      try {
        await mutateOnChain()
        setHasAlreadyVoted(true)
      } catch {}
      // Backend refresh broadcast
      try {
        const refreshed = await api.get(`/campaigns/${request.campaignId}/withdrawals`).then(r => r.data)
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('withdrawalsUpdated', { detail: refreshed }))
      } catch {}
      alert(`Vote submitted: ${approve ? 'Approve' : 'Reject'}`)
    } catch (err: any) {
      alert(err?.message || 'Vote failed')
    } finally {
      setVoting(false)
    }
  }

  const status = request?.status
  const badgeClass = status === 'EXECUTED' ? 'bg-emerald-100 text-emerald-800' : status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
  const showButtons = status === 'PENDING_VOTE' && timeLeft.total > 0 && !hasAlreadyVoted && isEligibleVoter

  // Derive vote amounts (ETH + INR) once data + price available
  const voteDisplay = useMemo(() => {
    if (isLoadingVoteCount || !onChainData) return { primary: 'Loading votes...', secondary: '' }
    try {
      const votesForEth = Number(ethers.formatEther(onChainData.votesFor))
      const votesAgainstEth = Number(ethers.formatEther(onChainData.votesAgainst))
      if (ethPriceInInr) {
        const votesForInr = votesForEth * ethPriceInInr
        const votesAgainstInr = votesAgainstEth * ethPriceInInr
        return {
          primary: `Vote Status: ${formatINR(votesForInr)} FOR / ${formatINR(votesAgainstInr)} AGAINST`,
          secondary: `(${formatEth(votesForEth)} / ${formatEth(votesAgainstEth)})`
        }
      }
      // Price not yet loaded; show ETH while fetching
      return {
        primary: `Vote Status: ${formatEth(votesForEth)} FOR / ${formatEth(votesAgainstEth)} AGAINST`,
        secondary: priceError ? `(INR price error)` : `(Fetching INR price…)`
      }
    } catch {
      return { primary: 'Vote Status: —', secondary: '' }
    }
  }, [isLoadingVoteCount, onChainData, ethPriceInInr, priceError])

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="font-medium text-lg">{request?.purpose}</div>
          <div className="text-sm subtle">Amount: {request?.amount} ETH</div>
          <div className="text-sm subtle">Vendor: {request?.vendorAddress ?? '—'}</div>
          <div className={`px-2 py-1 inline-block rounded-full text-xs mt-2 ${badgeClass}`}>{status}</div>
          <div className="mt-2 text-sm font-medium">
            {voteDisplay.primary}
            {voteDisplay.secondary && <span className="ml-1 text-xs opacity-60">{voteDisplay.secondary}</span>}
          </div>
          {timeLeft.total > 0 ? (
            <div className="text-xs subtle">Voting ends in: {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m</div>
          ) : (
            <div className="text-xs subtle">Voting closed</div>
          )}
          <div className="text-xs subtle mt-1">Submitted: {request?.createdAt ? new Date(request.createdAt).toLocaleString() : '—'}</div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex gap-2">
            {request?.financialProofUrl && (
              <a className="btn-ghost text-sm" target="_blank" rel="noreferrer" href={`http://localhost:8080/uploads/${request.financialProofUrl}`}>Financial Proof</a>
            )}
            {request?.visualProofUrl && (
              <a className="btn-ghost text-sm" target="_blank" rel="noreferrer" href={`http://localhost:8080/uploads/${request.visualProofUrl}`}>Visual Proof</a>
            )}
          </div>
          {status === 'PENDING_VOTE' && timeLeft.total > 0 && (
            <div className="mt-2">
              {!isAuthenticated && <p className="text-xs">Please log in to vote.</p>}
              {isAuthenticated && isEligibleVoter && !hasAlreadyVoted && (
                <div className="flex gap-2">
                  <button disabled={voting} onClick={() => handleVote(true)} className="btn bg-emerald-600 hover:bg-emerald-700 text-white">APPROVE</button>
                  <button disabled={voting} onClick={() => handleVote(false)} className="btn bg-rose-600 hover:bg-rose-700 text-white">REJECT</button>
                </div>
              )}
              {isAuthenticated && isEligibleVoter && hasAlreadyVoted && (
                <p className="text-xs subtle">You have already voted on this request.</p>
              )}
              {isAuthenticated && !isEligibleVoter && (
                <p className="text-xs text-rose-600">Only donors to this campaign are eligible to vote.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
