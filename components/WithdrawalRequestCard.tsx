"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { motion, AnimatePresence } from 'framer-motion'
import { getContract, getSigner } from '@/lib/web3'
import { api } from '@/lib/api'
import useSWR, { mutate } from 'swr'
import useCountdown from '@/lib/hooks/useCountdown'
import useOnChainVoteData from '@/lib/hooks/useOnChainVoteData'
import { useAuthStore } from '@/lib/store/auth'
import { getReadOnlyContract } from '@/lib/web3'
import { formatINR, formatEth } from '@/lib/format'
import { useEthPrice } from './EthPriceProvider'
import { usePathname } from 'next/navigation'
import { parseISO, format as formatDate } from 'date-fns'

interface VoteCounts { for: string; against: string }

export default function WithdrawalRequestCard({ request, donations, isLoadingDonations }: { request: any, donations?: any[], isLoadingDonations?: boolean }) {
  const [voting, setVoting] = useState(false)
  const [hasAlreadyVoted, setHasAlreadyVoted] = useState<boolean>(false)
  const [isEligibleVoter, setIsEligibleVoter] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [deadlineMs, setDeadlineMs] = useState<number>(0)
  const { user, isAuthenticated } = useAuthStore()
  const authLoading = useAuthStore(state => state.authLoading)
  const [debugHasDonated, setDebugHasDonated] = useState<any>(null)
  const [lastCheckAt, setLastCheckAt] = useState<number | null>(null)
  const [lastCheckMsg, setLastCheckMsg] = useState<string | null>(null)
  const [donationsList, setDonationsList] = useState<any[] | null>(null)

  // Resolve on-chain request id
  const onChainRequestId = request?.onChainRequestId ?? request?.onChainId ?? request?.id

  // Live on-chain vote counts (BigInt) fetched from a read-only contract
  const [voteCounts, setVoteCounts] = useState<{ for: bigint; against: bigint }>({ for: 0n, against: 0n })

  // Fetch on-chain vote data via SWR polling (every 5s) and set deadline
  const { data: onChainData, isLoading: isLoadingVoteCount, mutate: mutateOnChain } = useOnChainVoteData(onChainRequestId)
  useEffect(() => {
    if (!onChainData) return
    const sec = Number(onChainData.votingDeadline ?? 0)
    if (sec) setDeadlineMs(sec * 1000)
  }, [onChainData])

  // ETH->INR price from context (cached and refreshed periodically)
  const { price: ethPriceInInr, error: priceError } = useEthPrice()
  const pathname = usePathname()
  const isDev = process.env.NODE_ENV !== 'production'
  // JWT from store (if present) for authenticated backend calls
  const token = (useAuthStore as any).getState ? (useAuthStore as any).getState().accessToken : null
  const authHeaders: Record<string, string> | undefined = token ? { Authorization: `Bearer ${token}` } : undefined

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

  // Poll the blockchain every 5s for the authoritative vote counts and cache locally.
  useEffect(() => {
    let cancelled = false
    const fetchVoteCounts = async () => {
      try {
        const readOnly = await getReadOnlyContract()
        const reqId = BigInt(onChainRequestId ?? request?.id ?? 0)
        if (!reqId || reqId === 0n) {
          // nothing to fetch
          setVoteCounts({ for: 0n, against: 0n })
          setLastCheckMsg((s) => s ? s : 'NO_ONCHAIN_REQID')
          return
        }
        const req = await readOnly.withdrawalRequests(reqId)
        const votesFor = BigInt(req.votesFor?.toString?.() ?? '0')
        const votesAgainst = BigInt(req.votesAgainst?.toString?.() ?? '0')
        if (!cancelled) setVoteCounts({ for: votesFor, against: votesAgainst })
      } catch (err) {
        console.warn('fetchVoteCounts failed', err)
      }
    }
    // initial fetch
    fetchVoteCounts()
    const iv = setInterval(() => { fetchVoteCounts() }, 5000)
    return () => clearInterval(iv)
  }, [onChainRequestId, request?.id])

  // Ensure we know whether the current user already voted by probing the read-only contract
  useEffect(() => {
    let cancelled = false
    const checkHasVoted = async () => {
      try {
        // Use central api client so Authorization header is attached automatically
        const { data: me } = await api.get('/auth/me')
        const wallet = (me?.wallets && me.wallets[0]) || me?.walletAddress || null
        if (!wallet) return
        const readOnly = await getReadOnlyContract()
        const reqId = BigInt(onChainRequestId ?? request?.id ?? 0)
        if (!reqId || reqId === 0n) return
        const voted = !!(await readOnly.hasVoted(reqId, wallet))
        if (!cancelled) setHasAlreadyVoted(voted)
      } catch (err) {
        // ignore errors – treat as not voted
      }
    }
    checkHasVoted()
    return () => { cancelled = true }
  }, [onChainRequestId, request?.id, isAuthenticated])

  // Eligibility: final authoritative check using backend proof-of-donation and on-chain hasVoted
  // New eligibility flow per Satya Doctrine: use backend owner lookup for each donation
  useEffect(() => {
    // Simplified eligibility per your request:
    // 1) Fetch /api/auth/me to get the logged-in user's wallet.
    // 2) If user has a wallet, fetch /api/campaigns/{id}/donations and iterate donations.
    // 3) For each donation, call /api/donations/owner/{txHash} and compare ownerAddress to the /auth/me wallet.
    // 4) If any match, set isEligibleVoter=true. Do NOT perform any other checks (no on-chain hasVoted checks, no extra gating).
    let cancelled = false

    const checkEligibility = async () => {
        setIsLoading(true)
        try {
          // Use central api client so Authorization header is attached automatically
          let me: any = null
          try {
            const res = await api.get('/auth/me')
            me = res.data
          } catch (err) {
            setLastCheckAt(Date.now())
            setLastCheckMsg('AUTH_ME_FAILED')
            setIsEligibleVoter(false)
            setHasAlreadyVoted(false)
            return
          }
          const currentUserWallet = (me?.wallets && me.wallets[0]) || me?.walletAddress || null
          if (!currentUserWallet) {
            setLastCheckAt(Date.now())
            setLastCheckMsg('NO_WALLET_ON_AUTH_ME')
            setIsEligibleVoter(false)
            setHasAlreadyVoted(false)
            return
          }

        // Determine campaign id: prefer request props, otherwise derive from current URL pathname
        let campaignIdForCall: any = request?.campaign?.id ?? request?.campaignId
        if (!campaignIdForCall && typeof pathname === 'string') {
          // match /campaign/123 or /campaigns/123
          const m = pathname.match(/\/campaigns?\/(\d+)(?:\/|$)/i)
          if (m) {
            campaignIdForCall = Number(m[1])
            setLastCheckMsg(`DERIVED_CAMPAIGN_ID_FROM_PATH ${campaignIdForCall}`)
          }
        }
        if (!campaignIdForCall) {
          setLastCheckAt(Date.now())
          setLastCheckMsg('NO_CAMPAIGN_ID')
          setIsEligibleVoter(false)
          setHasAlreadyVoted(false)
          return
        }

        // Fetch donations from backend for this campaign
  // Use the frontend proxy (port 3000) for donations count per request
        // Fetch donations via frontend proxy so token and rewrites are used
        let donationsList: any = []
        try {
          const res = await api.get(`/campaigns/${campaignIdForCall}/donations`)
          donationsList = res.data
        } catch (err) {
          setLastCheckAt(Date.now())
          setLastCheckMsg('DONATIONS_FETCH_FAILED')
          setIsEligibleVoter(false)
          setHasAlreadyVoted(false)
          return
        }
        // Save locally for participation denominator and potential reuse
        setDonationsList(Array.isArray(donationsList) ? donationsList : [])
        if (!Array.isArray(donationsList) || donationsList.length === 0) {
          setLastCheckAt(Date.now())
          setLastCheckMsg('NO_DONATIONS')
          setIsEligibleVoter(false)
          setHasAlreadyVoted(false)
          return
        }

        let verified = false
        for (const donation of donationsList) {
          if (cancelled) return
          const txHash = donation?.transactionHash
          if (!txHash) continue
          try {
            // Use api client – owner lookup may require auth
            let ownerJson: any = null
            try {
              const ownerRes = await api.get(`/donations/owner/${txHash}`)
              ownerJson = ownerRes.data
            } catch (err) {
              continue
            }
            const ownerAddress = ownerJson?.ownerAddress
            setLastCheckAt(Date.now())
            setLastCheckMsg(`OWNER_LOOKUP ${txHash} -> ${ownerAddress}`)
            if (ownerAddress && ownerAddress.toLowerCase() === String(currentUserWallet).toLowerCase()) {
              verified = true
              break
            }
          } catch (err) {
            console.warn('owner lookup failed for', txHash, err)
            continue
          }
        }

        setIsEligibleVoter(verified)
        // We explicitly do NOT query on-chain hasVoted here per your instruction
        setHasAlreadyVoted(false)
      } catch (err) {
        console.error('simplified eligibility check failed', err)
        setLastCheckAt(Date.now())
        setLastCheckMsg('ERROR: simplified eligibility')
        setIsEligibleVoter(false)
        setHasAlreadyVoted(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkEligibility()
    return () => { cancelled = true }
  }, [request?.campaign?.id, request?.campaignId])

  // Countdown hook based on on-chain deadline when available; otherwise parse ISO from backend safely
  const rawDeadline = (() => {
    if (deadlineMs) return deadlineMs
    const vd = request?.votingDeadline
    if (!vd) return 0
    try {
      if (typeof vd === 'number') return vd > 1e12 ? vd : vd * 1000 // support seconds
      if (typeof vd === 'string') return parseISO(vd).getTime()
    } catch {}
    return 0
  })()
  const timeLeft = useCountdown(rawDeadline)

  async function handleVote(approve: boolean) {
    try {
      setVoting(true)
      const contract = await getContract()
      const signer = await getSigner()
      const from = await signer?.getAddress()
      if (!from) throw new Error('Please connect your wallet')
      // Ensure we pass a correct BigInt request id and log it for debugging
      const reqIdBig = BigInt(onChainRequestId ?? request?.id ?? 0)
      console.log(`Preparing to send ON-CHAIN VOTE for Request ID: ${reqIdBig}, Vote: ${approve}`)

      // Pre-check on-chain request state to avoid sending a tx that will revert
      try {
        const readOnly = await getReadOnlyContract()
        const onChainReq = await readOnly.withdrawalRequests(reqIdBig)
        console.log('onChainReq before vote:', onChainReq)
        // Try common deadline fields (some contracts store votingDeadline in seconds)
        const deadlineSec = Number(onChainReq.votingDeadline ?? onChainReq.deadline ?? 0)
        const nowSec = Math.floor(Date.now() / 1000)
        if (deadlineSec && deadlineSec <= nowSec) {
          setLastCheckMsg('PRECHECK: votingDeadline passed')
          setVoting(false)
          if (isDev) console.info('Voting inactive: deadline passed for request', reqIdBig)
          return
        }
        // Optional: check a boolean/enum status field if present
        const statusField = onChainReq.status ?? onChainReq.state ?? null
        if (statusField && String(statusField).toLowerCase().includes('inactive')) {
          setLastCheckMsg('PRECHECK: status inactive')
          setVoting(false)
          if (isDev) console.info('Voting inactive: status field indicates inactive for request', reqIdBig, statusField)
          return
        }
      } catch (preErr) {
        // If pre-check fails (read error), log but continue to attempt vote — however this is safer to abort
        console.warn('pre-vote on-chain check failed', preErr)
        setLastCheckMsg('PRECHECK_ERROR')
        // proceed cautiously — let the contract handle reverts, but user will see error
      }

  if (isDev) console.log(`Sending ON-CHAIN VOTE for Request ID: ${reqIdBig}, Vote: ${approve}`)
      const tx = await contract.voteOnRequest(reqIdBig, approve)
      await tx.wait()
      // Refresh on-chain vote data
      try {
        // Immediately refresh our local vote counts and SWR-backed on-chain data
  try { await mutateOnChain() } catch {}
  // fetch our new counts instantly
  setHasAlreadyVoted(true)
  // also attempt to refresh the read-only poll immediately by invoking the effect's fetch (mutateOnChain already called)
      } catch {}
      // After voting, probe on-chain tallies and possibly trigger early execution if threshold crossed
      try {
        // Use a read-only contract to fetch updated tallies
        const readOnly = await getReadOnlyContract()
        const req = await readOnly.withdrawalRequests(reqIdBig)
        // votes may be BigNumber-like; convert to BigInt
        const votesFor = BigInt(req.votesFor?.toString?.() ?? '0')
        const votesAgainst = BigInt(req.votesAgainst?.toString?.() ?? '0')
        // Update our local voteCounts cache so UI updates instantly
        setVoteCounts({ for: votesFor, against: votesAgainst })
        
        // Compute 60% rule against total voting power (on-chain campaign balance)
        let campaignIdForCall: any = request?.campaign?.id ?? request?.campaignId
        if (!campaignIdForCall && typeof pathname === 'string') {
          const m = pathname.match(/\/campaigns?\/(\d+)(?:\/|$)/i)
          if (m) campaignIdForCall = Number(m[1])
        }
        let totalVotingPowerWei: bigint = 0n
        if (campaignIdForCall) {
          try {
            // Use the api client (frontend proxy) so Authorization header is included
            const r = await api.get(`/campaigns/${campaignIdForCall}/balance`)
            const bj = r.data
            const balEth = Number(bj?.balance ?? bj ?? 0)
            if (isFinite(balEth) && balEth > 0) totalVotingPowerWei = ethers.parseEther(String(balEth))
          } catch {}
        }
        if (totalVotingPowerWei > 0n) {
          const pctFor = (votesFor * 100n) / totalVotingPowerWei
          console.log('Post-vote tallies & power threshold', { votesFor: votesFor.toString(), totalVotingPowerWei: totalVotingPowerWei.toString(), pctFor: pctFor.toString() })
          if (pctFor > 60n) {
            try {
              const execContract = await getContract()
              const execTx = await execContract.triggerEarlyExecution(reqIdBig)
              await execTx.wait()
              try { await mutateOnChain() } catch {}
              alert('VOTE PASSED! Execution triggered. The funds are on their way.')
            } catch (execErr) {
              console.warn('triggerEarlyExecution failed', execErr)
            }
          }
        }
        const total = votesFor + votesAgainst
        if (total > 0n) {
          const pctFor = (votesFor * 100n) / total
          console.log('Post-vote tallies', { votesFor: votesFor.toString(), votesAgainst: votesAgainst.toString(), pctFor: pctFor.toString() })
          if (pctFor > 60n) {
            if (isDev) console.log('Threshold exceeded: attempting early execution')
            try {
              const execContract = await getContract()
              const execTx = await execContract.triggerEarlyExecution(reqIdBig)
              await execTx.wait()
              // refresh on-chain state after execution
              try { await mutateOnChain() } catch {}
              setLastCheckMsg('VOTE PASSED: execution triggered')
              if (isDev) console.info('triggerEarlyExecution succeeded for', reqIdBig)
            } catch (execErr: any) {
              if (isDev) console.warn('Early execution attempt failed', execErr)
              setLastCheckMsg('EXECUTION_FAILED')
            }
          }
        }
      } catch (e) {
        console.warn('Failed to probe/execute after vote', e)
      }
      // Backend refresh broadcast
      try {
        const resp = await api.get(`/campaigns/${request.campaignId}/withdrawals`)
        const refreshed = resp?.data ?? null
        if (typeof window !== 'undefined' && refreshed) window.dispatchEvent(new CustomEvent('withdrawalsUpdated', { detail: refreshed }))
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
  const { data: backendVoteCount } = useSWR(
    request?.id ? [`/withdrawals/${request.id}/votecount`, token] : null,
    async ([path]) => {
      try {
        const res = await api.get(path)
        return Number(res.data?.count ?? 0)
      } catch {
        return 0
      }
    },
    { refreshInterval: 5000 }
  )

  const voteDisplay = useMemo(() => {
    // Participation metric: X of Y donors have voted
    const donorsArr = Array.isArray(donationsList) ? donationsList : (Array.isArray(donations) ? donations : [])
    const uniqueDonors = new Set<string>(donorsArr.map((d: any) => String(d?.username ?? '')).filter(Boolean))
    const y = uniqueDonors.size
    const x = Number(backendVoteCount ?? 0)
    return {
      primary: `Participation: ${x} of ${y} Donors Have Voted`,
      secondary: ''
    }
  }, [backendVoteCount, donationsList, donations])

  return (
    <motion.div layout className="card p-4">
      {/* Dev debug overlay - keep compact */}
      <div className="text-xs subtle mb-2 p-3 border rounded bg-gray-900/10">
        <div className="font-semibold mb-1">Eligibility Debug</div>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div className="opacity-80">Auth loading:</div>
          <div>{String(authLoading)}</div>

          <div className="opacity-80">Is authenticated:</div>
          <div>{String(isAuthenticated)}</div>

          <div className="opacity-80">User wallet:</div>
          <div>{user?.wallets?.[0]?.address ?? '—'}</div>

          <div className="opacity-80">Campaign ID:</div>
          <div>{request?.campaign?.id ?? request?.campaignId ?? '—'}</div>

          <div className="opacity-80">On-chain Request ID:</div>
          <div>{onChainRequestId ?? '—'}</div>

          <div className="opacity-80">Backend hasDonated:</div>
          <div>{String(debugHasDonated)}</div>

          <div className="opacity-80">On-chain hasVoted:</div>
          <div>{String(hasAlreadyVoted)}</div>

          <div className="opacity-80">isEligibleVoter:</div>
          <div>{String(isEligibleVoter)}</div>

          <div className="opacity-80">Last check time:</div>
          <div>{lastCheckAt ? new Date(lastCheckAt).toLocaleString() : '—'}</div>

          <div className="opacity-80">Last check msg:</div>
          <div className="break-words">{lastCheckMsg ?? '—'}</div>
        </div>
        {onChainData && (
          <div className="mt-2 text-[12px]">
            <div className="opacity-80">On-chain votes (ETH):</div>
            <div>
              For: {onChainData?.votesFor ? formatEth(Number(ethers.formatEther(onChainData.votesFor))) : '—'}
              {' '}Against: {onChainData?.votesAgainst ? formatEth(Number(ethers.formatEther(onChainData.votesAgainst))) : '—'}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div className="md:col-span-2">
          <div className="font-medium text-lg">{request?.purpose}</div>
          <div className="text-sm subtle">Amount: {request?.amount} ETH</div>
          <div className="text-sm subtle">Vendor: {request?.vendorAddress ?? '—'}</div>
          <div className={`px-2 py-1 inline-block rounded-full text-xs mt-2 ${badgeClass}`}>{status}</div>
          <div className="mt-3">
            <div className="text-sm font-medium">{voteDisplay.primary}</div>
            <div className="mt-2">
              {/* Visual vote bar */}
              {(() => {
                const forVotes = Number((voteCounts.for ?? 0n).toString()) || 0
                const againstVotes = Number((voteCounts.against ?? 0n).toString()) || 0
                const total = Math.max(1, forVotes + againstVotes)
                const pctFor = Math.round((forVotes / total) * 100)
                const pctAgainst = 100 - pctFor
                return (
                  <div className="w-full bg-slate-100 rounded-md h-4 overflow-hidden border">
                    <div className="relative h-4 flex">
                      <div className="bg-emerald-500 h-4" style={{ width: `${pctFor}%` }} title={`For: ${forVotes} • Against: ${againstVotes}`} />
                      <div className="bg-rose-500 h-4" style={{ width: `${pctAgainst}%` }} title={`Against: ${againstVotes} • For: ${forVotes}`} />
                      <div style={{ left: '60%' }} className="absolute top-0 h-4 w-[1px] bg-white opacity-60 border-l border-dashed" />
                    </div>
                    <div className="mt-1 text-xs subtle">For: {forVotes} • Against: {againstVotes}</div>
                  </div>
                )
              })()}
            </div>

            <div className="mt-2 text-xs subtle">{timeLeft.total > 0 ? `Voting ends in: ${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m` : 'Voting closed'}</div>
            <div className="text-xs subtle mt-1">Submitted: {request?.createdAt ? formatDate(parseISO(String(request.createdAt)), 'PPpp') : '—'}</div>
          </div>
        </div>

        <div className="md:col-span-1 flex flex-col items-end gap-4">
          <div className="flex gap-2">
            {request?.financialProofUrl && (
              <a className="btn-ghost text-sm inline-flex items-center gap-2" target="_blank" rel="noreferrer" href={`/uploads/${request.financialProofUrl}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h8m-8 4h6" /></svg>
                Financial Proof
              </a>
            )}
            {request?.visualProofUrl && (
              <a className="btn-ghost text-sm inline-flex items-center gap-2" target="_blank" rel="noreferrer" href={`/uploads/${request.visualProofUrl}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9 6 9-6" /></svg>
                Visual Proof
              </a>
            )}
          </div>

          {status === 'PENDING_VOTE' && (
            <div className="w-full">
              <AnimatePresence>
                {timeLeft.total > 0 && (
                  <div className="w-full">
                    {isLoading && (
                      <p className="text-xs">Verifying your voter eligibility…</p>
                    )}
                    {!isLoading && !isEligibleVoter && (
                      <p className="text-xs text-rose-600">Only verified donors to this campaign can vote.</p>
                    )}
                    {!isLoading && isEligibleVoter && hasAlreadyVoted && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs subtle">You have already voted on this request.</motion.div>
                    )}
                    {!isLoading && isEligibleVoter && !hasAlreadyVoted && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                        <button disabled={voting} onClick={() => handleVote(true)} className="btn inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2">
                          {voting ? <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                          <span>{voting ? 'Submitting vote...' : 'Approve'}</span>
                        </button>
                        <button disabled={voting} onClick={() => handleVote(false)} className="btn inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2">
                          {voting ? <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>}
                          <span>{voting ? 'Submitting vote...' : 'Reject'}</span>
                        </button>
                      </motion.div>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
