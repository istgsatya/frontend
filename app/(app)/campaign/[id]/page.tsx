"use client"
import { useEffect, useMemo, useState } from 'react'
import { mutate } from 'swr'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth'
import { useParams } from 'next/navigation'
import { fetchEthPrice, fiatToEth } from '@/lib/price'
import { formatEth, formatINR, formatDateHuman } from '@/lib/format'
import { getContract, getSigner, getProvider, ensureSepolia } from '@/lib/web3'
import { parseEther } from 'ethers'
import { motion } from 'framer-motion'

export default function CampaignDetail() {
  const params = useParams() as { id: string }
  const id = params?.id
  const [campaign, setCampaign] = useState<any>(null)
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [donations, setDonations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState<number | null>(null)
  const [amountFiat, setAmountFiat] = useState('')
  const [price, setPrice] = useState<number>(0)
  const [wallet, setWallet] = useState<string | null>(null)
  const [hasVotedMap, setHasVotedMap] = useState<Record<string, boolean>>({})
  const [onChainVotes, setOnChainVotes] = useState<Record<string, { for: string; against: string }>>({})
  const [donating, setDonating] = useState(false)
  const [donateSuccess, setDonateSuccess] = useState(false)
  const [lastTxHash, setLastTxHash] = useState<string | null>(null)
  const user = useAuthStore(s => s.user)
  // Avoid hydration mismatch: render a stable placeholder on the server and the
  // initial client render. Only show the full interactive UI after the
  // component has mounted on the client.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const ethAmount = useMemo(() => fiatToEth(parseFloat(amountFiat || '0'), price), [amountFiat, price])

  // Initial parallel data fetch: campaign metadata, on-chain balance, withdrawals, donations
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [cRes, bRes, wRes, dRes] = await Promise.allSettled([
          api.get(`/campaigns/${id}`),
          api.get(`/campaigns/${id}/balance`),
          api.get(`/campaigns/${id}/withdrawals`),
          api.get(`/campaigns/${id}/donations`),
        ])
        if (!mounted) return
        if (cRes.status === 'fulfilled') setCampaign(cRes.value.data)
        if (bRes.status === 'fulfilled') setBalance(Number(bRes.value.data?.balance ?? 0))
        if (wRes.status === 'fulfilled') setWithdrawals(wRes.value.data)
        if (dRes.status === 'fulfilled') setDonations(dRes.value.data)
      } catch (e) {
        // swallow; individual call results handled above
      } finally {
        if (mounted) setLoading(false)
      }
    })()
  // fetch a live price to allow quick ETH preview and convert Raised -> INR
  fetchEthPrice('inr').then(setPrice).catch(() => setPrice(0))
    return () => { mounted = false }
  }, [id])

  // Poll for live updates every 7 seconds
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        // Refresh campaign metadata, balance, withdrawals, donations in parallel
        const [cRes, bRes, wRes, dRes] = await Promise.allSettled([
          api.get(`/campaigns/${id}`).then(r => r.data),
          api.get(`/campaigns/${id}/balance`).then(r => r.data?.balance),
          api.get(`/campaigns/${id}/withdrawals`).then(r => r.data),
          api.get(`/campaigns/${id}/donations`).then(r => r.data),
        ])
  if (cRes.status === 'fulfilled') setCampaign(cRes.value)
  if (bRes.status === 'fulfilled') setBalance(Number(bRes.value ?? 0))
        if (wRes.status === 'fulfilled') setWithdrawals(wRes.value)
        if (dRes.status === 'fulfilled') setDonations(dRes.value)
      } catch {}
    }, 7000)
    return () => clearInterval(iv)
  }, [id])

  // When the fiat input changes, refresh the price (debounced) to show ETH equivalent
  useEffect(() => {
    if (!amountFiat) return
    const t = setTimeout(() => {
      fetchEthPrice('inr').then(setPrice).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [amountFiat])

  // Listen for withdrawal refresh events from WithdrawalRequestCard and update list
  useEffect(() => {
    const handler = (e: any) => {
      const payload = e?.detail
      if (Array.isArray(payload)) setWithdrawals(payload)
    }
    window.addEventListener('withdrawalsUpdated', handler as EventListener)
    return () => window.removeEventListener('withdrawalsUpdated', handler as EventListener)
  }, [])

  // Probe wallet and prefetch on-chain vote state for visible withdrawal requests
  useEffect(() => {
    (async () => {
      try {
        const signer = await getSigner()
        const addr = await signer?.getAddress()
        if (!addr) return
        setWallet(addr)
        const contract = await getContract()
        // Query on-chain vote tallies and whether the user has voted
        const entries = await Promise.all(
          withdrawals.map(async (w) => {
            const requestId = BigInt(w?.onChainId ?? w?.id)
            try {
              const voted: boolean = await contract.hasVoted(requestId, addr)
              const req = await contract.withdrawalRequests(requestId)
              return [
                String(w.id),
                {
                  voted,
                  votes: { for: req.votesFor?.toString?.() ?? '0', against: req.votesAgainst?.toString?.() ?? '0' }
                }
              ] as const
            } catch {
              return [String(w.id), { voted: false, votes: { for: '0', against: '0' } }] as const
            }
          })
        )
        const votedMap: Record<string, boolean> = {}
        const votesMap: Record<string, { for: string; against: string }> = {}
        for (const [key, data] of entries) {
          votedMap[key] = data.voted
          votesMap[key] = data.votes
        }
        setHasVotedMap(votedMap)
        setOnChainVotes(votesMap)
      } catch {
        // ignore wallet errors silently
      }
    })()
  }, [withdrawals])

  async function donate() {
    try {
      setDonating(true)
      setDonateSuccess(false)
      const contract = await getContract()
      if (!contract) throw new Error('Contract not configured')
  const onChainId = BigInt(campaign?.onChainId ?? campaign?.id)
  // Ensure the connected wallet matches the user's registered wallet and that the network is Sepolia
  const provider = getProvider()
  if (!provider) throw new Error('No Web3 provider found; please install a compatible wallet (e.g., MetaMask)')
  // Check for already-connected accounts first to avoid re-prompting MetaMask
  let accounts: string[] = []
  try {
    // @ts-ignore - use eth_accounts RPC to list connected accounts without prompting
    accounts = await provider.send('eth_accounts', [])
  } catch {
    try {
      // fallback to provider.listAccounts for some provider implementations
      // @ts-ignore
      accounts = await provider.listAccounts()
    } catch {
      accounts = []
    }
  }
  if (!accounts || accounts.length === 0) {
    // Request accounts explicitly (this will prompt the user to connect if not connected)
    try {
      // Try permissions first
      // @ts-ignore
      await provider.send('wallet_requestPermissions', [{ eth_accounts: {} }])
    } catch {
      // ignore
    }
    // Fallback to explicit request which will trigger the wallet connect UI
    // @ts-ignore
    await provider.send('eth_requestAccounts', [])
  }
  const signer = await provider.getSigner()
  const donor = await signer?.getAddress()
  // Check network chainId (Sepolia is 11155111)
    try {
      // Attempt to switch the user's wallet to Sepolia programmatically.
      // If this fails, ensureSepolia will throw a friendly message.
      await ensureSepolia(provider)
    } catch (e: any) {
      throw new Error(e?.message || 'Please switch your wallet network to Sepolia testnet')
    }
  // Check registered wallet
  const registeredWallets: string[] = (user as any)?.wallets ?? []
  if (registeredWallets.length > 0) {
    const normalizedRegistered = registeredWallets.map((w: string) => String(w).toLowerCase())
    if (!normalizedRegistered.includes(String(donor).toLowerCase())) {
      throw new Error(`Please switch your wallet in MetaMask to your registered address: ${registeredWallets[0]}`)
    }
  }
  if (!donor) throw new Error('No wallet connected')
  // Build a safe ETH amount string truncated to 18 decimals to avoid ethers.js numeric precision errors
  const preciseEthAmountString = String(ethAmount)
  const decimalMatch = preciseEthAmountString.match(/^-?\d+(?:\.\d{0,18})?/) // allow up to 18 decimals
  if (!decimalMatch) throw new Error('Invalid number format for donation amount')
  const truncatedEthAmountString = decimalMatch[0]
  const valueInWei = parseEther(truncatedEthAmountString)
  const tx = await contract.recordDonation(onChainId, donor, 'CRYPTO', { value: valueInWei })
      const receipt = await tx.wait()
      // Do NOT show the tx hash until backend verification succeeds.
      // Immediately post the transaction to the backend verify endpoint and await the result.
        try {
        // Ensure the verify POST includes the Authorization header explicitly as a defensive measure
        const token = (useAuthStore as any).getState ? (useAuthStore as any).getState().accessToken : null
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined
        // Dev-time diagnostics: log a masked token and the headers object so you can confirm
        // whether the currently-logged-in user's token is being attached to the request.
        if (process.env.NODE_ENV !== 'production') {
          try {
            const masked = token ? `${String(token).slice(0,6)}...${String(token).slice(-4)}` : '<<no-token>>'
            // eslint-disable-next-line no-console
            console.debug('[donate] verify POST token (masked):', masked)
            // eslint-disable-next-line no-console
            console.debug('[donate] verify POST headers:', headers)
          } catch {}
        }
        const verifyRes = await api.post('/donations/crypto/verify', { transactionHash: tx.hash }, { headers })
        // Backend verified the on-chain donation — now force UI revalidation.
        try {
          await mutate(`/api/campaigns/${id}/balance`)
          await mutate(`/api/campaigns/${id}/donations`)
        } catch {}

        // Also refresh local page state to ensure immediate consistency (fallback if SWR hooks aren't used)
        try {
          const [c, b, d] = await Promise.all([
            api.get(`/campaigns/${id}`).then(r => r.data),
            api.get(`/campaigns/${id}/balance`).then(r => r.data?.balance),
            api.get(`/campaigns/${id}/donations`).then(r => r.data),
          ])
          setCampaign(c)
          setBalance(Number(b ?? 0))
          setDonations(d)
        } catch {}

        // Now it's safe to display the verified tx hash and success UI
        setLastTxHash(tx.hash)
        setDonateSuccess(true)
        setTimeout(() => setDonateSuccess(false), 1800)
        // Best-effort: revalidate related caches
        try {
          await Promise.allSettled([
            mutate('/donations/me'),
            mutate('/dashboard/donor'),
            mutate('/dashboard/charity')
          ])
        } catch {}
        // Optional success toast
        if (typeof window !== 'undefined') alert('Donation confirmed and recorded.')
      } catch (verifyErr: any) {
        // Backend verification failed. The tx is on-chain but the backend rejected it.
        const backendMsg = verifyErr?.response?.data?.message || verifyErr?.message || 'Verification failed'
        if (typeof window !== 'undefined') alert(`Donation recorded on-chain but verification failed: ${backendMsg}`)
      }
    } catch (e: any) {
      alert(e?.message || 'Donation failed')
    } finally {
      setDonating(false)
    }
  }

  async function vote(requestId: string | number, approve: boolean) {
    try {
      const contract = await getContract()
      const signer = await getSigner()
      const from = await signer?.getAddress()
      if (!from) throw new Error('Please connect your wallet first')
      const onChainId = BigInt((requestId as any)?.onChainId ?? requestId)
      const tx = await contract.voteOnRequest(onChainId, approve)
      await tx.wait()
      // After voting, re-fetch withdrawals from backend to reflect any status updates
      try {
        const w = await api.get(`/campaigns/${id}/withdrawals`).then(r => r.data)
        setWithdrawals(w)
      } catch {}
      alert(`On-chain vote ${approve ? 'Approve' : 'Reject'} submitted.`)
    } catch (e: any) {
      alert(e?.message || 'Vote failed')
    }
  }

  // If we haven't mounted yet, render the same placeholder the server will
  // produce to prevent hydration errors (server and client HTML must match).
  if (!mounted) return <div className="container py-10"><div className="subtle">Loading...</div></div>
  if (loading) return <div className="container py-10"><div className="subtle">Loading...</div></div>
  if (!campaign) return <div className="container py-10"><div className="subtle">Not found.</div></div>

  return (
    <div className="container py-6 space-y-8">
      <section className="space-y-3">
        <h1 className="heading">{campaign.title}</h1>
        <p className="text-slate-700">{campaign.description}</p>
        <div className="subtle">Goal: {campaign.goal}</div>
        {/* Progress Bar — use on-chain balance as source of truth */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <AnimatedProgress goal={campaign?.goal} raised={balance ?? Number(campaign?.amountRaised ?? 0)} />
          </div>
          <div className="text-sm subtle w-40 text-right">Raised: {typeof balance === 'number' ? formatINR((balance ?? 0) * price, 0) : formatINR(0, 0)} </div>
        </div>
        <div className="card mt-4 p-4 space-y-3">
          <div className="text-sm text-slate-700">Enter amount (INR)</div>
          <input value={amountFiat} onChange={e => setAmountFiat(e.target.value)} className="input" placeholder="1000" />
          <div className="text-sm subtle transition-opacity">≈ {isFinite(ethAmount) ? formatEth(ethAmount, 6) : '—'} </div>
          {/* Block donate for charity admins donating to their own campaigns */}
          <button
            onClick={donate}
            disabled={donating || (
              (user as any)?.roles?.includes?.('ROLE_CHARITY_ADMIN') && (
                  // campaign may have charityId or campaign.charity?.id; user may have charityId
                  String((user as any)?.charityId ?? (user as any)?.charity?.id) === String(campaign?.charityId ?? campaign?.charity?.id)
                )
            )}
            className="btn-primary w-full sm:w-auto relative overflow-hidden disabled:opacity-70"
          >
            {!donateSuccess ? (
              <span className="inline-flex items-center gap-2">
                {donating && (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
                Donate
              </span>
            ) : (
              <motion.span initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Success
              </motion.span>
            )}
          </button>
          {(user as any)?.roles?.includes?.('ROLE_CHARITY_ADMIN') && String((user as any)?.charityId ?? (user as any)?.charity?.id) === String(campaign?.charityId ?? campaign?.charity?.id) && (
            <div className="mt-2 text-sm text-rose-600">Charity admins cannot donate to campaigns belonging to their own charity.</div>
          )}
          {lastTxHash && (
            <div className="mt-2 text-sm">
              Transaction: <a className="text-brand-700 underline" target="_blank" href={`https://sepolia.etherscan.io/tx/${lastTxHash}`}>{lastTxHash}</a>
            </div>
          )}
        </div>
      </section>

      {/* Donations list for this campaign */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Donations</h2>
        <div className="space-y-3">
          {Array.isArray(donations) && donations.length > 0 ? (
            <div className="card p-4">
              <ul className="space-y-2 text-sm">
                {donations.map((d: any) => {
                  // Resolve donation amounts robustly: server may provide fiat or ETH fields
                  const ethAmt = Number(d?.amount ?? d?.amountEth ?? d?.value ?? 0)
                  const serverFiat = Number(d?.amountFiat ?? d?.amountInr ?? d?.fiatAmount ?? 0)
                  const inrValue = (serverFiat && serverFiat > 0) ? serverFiat : ((price && ethAmt) ? ethAmt * price : 0)
                  return (
                    <li key={d.id || d.transactionHash} className="flex justify-between items-start">
                      <div className="max-w-lg">
                        <div className="font-medium">{d.username ?? d.donorName ?? d.from ?? (d.from?.slice ? `${d.from.slice(0,6)}...${d.from.slice(-4)}` : 'Anonymous')}</div>
                                    <div className="subtle text-xs">{formatDateHuman(d.createdAt)} • {d.campaignTitle ? <a className="underline text-brand-700" href={`/campaign/${d.campaignId}`}>{d.campaignTitle}</a> : null}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatINR(Number(inrValue) || 0, 0)}</div>
                        {ethAmt ? <div className="text-xs subtle mt-1">≈ {typeof ethAmt === 'number' ? formatEth(ethAmt, 6) : ethAmt} ETH</div> : null}
                        <div className="text-xs mt-1">{d.transactionHash ? <a target="_blank" rel="noreferrer" href={`https://sepolia.etherscan.io/tx/${d.transactionHash}`} className="underline text-brand-700">View on Etherscan</a> : <span className="subtle">—</span>}</div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : (
            <div className="text-sm subtle">No donations yet</div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Withdrawal History</h2>
        <div className="space-y-3">
          {Array.isArray(withdrawals) && withdrawals.length > 0 ? (
            withdrawals.map((w) => (
              <WithdrawalRequestCard key={w.id} withdrawal={w} onVote={vote} onRefresh={async () => {
                try {
                  const w2 = await api.get(`/campaigns/${id}/withdrawals`).then(r => r.data)
                  setWithdrawals(w2)
                } catch {}
              }} />
            ))
          ) : (
            <div className="text-sm subtle">No withdrawal requests have been made yet.</div>
          )}
        </div>
      </section>
    </div>
  )
}

function WithdrawalRequestCard({ withdrawal, onVote, onRefresh }: { withdrawal: any; onVote: (id: any, approve: boolean) => void; onRefresh: () => void }) {
  const status = withdrawal.status
  const badge = status === 'EXECUTED' ? 'bg-emerald-100 text-emerald-800' : status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
  return (
    <div className="card p-4" key={withdrawal.id}>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{withdrawal.purpose}</div>
          <div className="text-sm subtle">Amount: {formatEth(withdrawal.amount, 6)}</div>
          <div className="text-sm">Status: <span className={`px-2 py-1 rounded-full text-xs ${badge}`}>{status}</span></div>
          <div className="text-xs subtle mt-1">Submitted: {formatDateHuman(withdrawal.createdAt)}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {withdrawal.status === 'PENDING_VOTE' && (new Date(withdrawal.votingDeadline).getTime() || 0) > Date.now() && (
            <div className="flex gap-2">
              <button onClick={() => onVote(withdrawal.id, true)} className="btn bg-emerald-600 hover:bg-emerald-700 text-white">Approve</button>
              <button onClick={() => onVote(withdrawal.id, false)} className="btn bg-rose-600 hover:bg-rose-700 text-white">Reject</button>
            </div>
          )}
          <div className="flex gap-2">
            {withdrawal.financialProofUrl && (
              <a href={`http://localhost:8080/uploads/${withdrawal.financialProofUrl}`} target="_blank" rel="noreferrer" className="btn-ghost text-sm">View Financial Proof</a>
            )}
            {withdrawal.visualProofUrl && (
              <a href={`http://localhost:8080/uploads/${withdrawal.visualProofUrl}`} target="_blank" rel="noreferrer" className="btn-ghost text-sm">View Visual Proof</a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function AnimatedProgress({ goal, raised }: { goal: number; raised: number }) {
  const pct = !goal || goal <= 0 ? 0 : Math.min(100, Math.round((Number(raised || 0) / Number(goal)) * 100))
  return (
    <div className="w-full bg-black/5 rounded-full h-3 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="h-3 bg-gradient-to-r from-brand-500 to-emerald-500"
      />
      <div className="mt-1 text-xs subtle">{pct}% funded</div>
    </div>
  )
}
