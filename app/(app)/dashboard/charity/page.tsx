"use client"
import { Fragment, useEffect, useState } from 'react'
import useSWR from 'swr'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth'
import { useRouter } from 'next/navigation'
import CountUp from 'react-countup'
import { fetchEthPrice, fiatToEth } from '@/lib/price'
import { formatEth, formatINR, formatDateHuman } from '@/lib/format'
import { createPortal } from 'react-dom'
// DonationsTable removed — donation history is linked separately
import { WalletPromptBanner } from '@/components/WalletPromptBanner'

const fetcher = (url: string) => api.get(url).then(r => r.data)

export default function CharityDashboard() {
  const user = useAuthStore(s => s.user)
  const router = useRouter()

  const [showActive, setShowActive] = useState(false)
  const [displayedCampaigns, setDisplayedCampaigns] = useState<any[] | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  const [campaignBalances, setCampaignBalances] = useState<Record<string, number>>({})
  const [totalRaisedReal, setTotalRaisedReal] = useState<number>(0)
  const [price, setPrice] = useState<number>(0)

  useEffect(() => {
    if (!user) return
    const isAdmin = (user as any)?.roles?.includes('ROLE_CHARITY_ADMIN')
    if (!isAdmin) {
      router.replace('/')
      return
    }
  }, [user, router])

  const { data: summary } = useSWR(user ? '/dashboard/charity' : null, fetcher, { refreshInterval: 7000 })
  // (donation history link provided below) — detailed donation history is on its own page
  // When campaigns are present, fetch on-chain balances for each and compute a real total
  useEffect(() => {
    if (!summary) return
    if (!Array.isArray(summary?.campaigns) || summary.campaigns.length === 0) {
      setCampaignBalances({})
      setTotalRaisedReal(0)
      return
    }

    let mounted = true

    async function fetchBalances() {
      try {
        const entries = await Promise.all(summary.campaigns.map(async (c: any) => {
          try {
            const b = await api.get(`/campaigns/${c.id}/balance`).then(r => r.data?.balance)
            return [String(c.id), Number(b ?? 0)] as const
          } catch {
            return [String(c.id), 0] as const
          }
        }))
        if (!mounted) return
        const map = Object.fromEntries(entries)
        setCampaignBalances(map)

        // Compute total raised in INR using server-provided fiat when available,
        // otherwise convert on-chain ETH balances to INR via price.
        const totalInr = summary.campaigns.reduce((acc: number, c: any) => {
          const serverRaised = Number(c?.raised ?? 0)
          if (serverRaised && serverRaised > 0) return acc + serverRaised
          const balEth = Number(map[String(c.id)] ?? 0)
          return acc + (balEth * price)
        }, 0)

        setTotalRaisedReal(totalInr)
      } catch {
        if (!mounted) return
      }
    }

    fetchBalances()
    const iv = setInterval(fetchBalances, 7000)
    return () => { mounted = false; clearInterval(iv) }
  }, [summary?.campaigns, price])

  // fetch INR price for display
  useEffect(() => {
    fetchEthPrice('inr').then(setPrice).catch(() => setPrice(0))
  }, [])

  if (!summary) return <div className="container py-10">Loading...</div>

  return (
    <div className="container py-6 space-y-8">
      {/* Top summary: Total Raised + primary CTA */}
      <div className="card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-sm subtle">Total raised (real-time)</div>
          <div className="text-3xl font-extrabold mt-1">{formatINR(totalRaisedReal, 0)}</div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/dashboard/charity/treasury" className="btn-primary text-lg">Manage Funds</a>
          <div className="flex items-center gap-2">
            <CreateCampaignButton />
            <CreatePostButton />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <a href="/dashboard/charity/donations" className="text-sm underline subtle">View full donation history</a>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        {/* Wallet prompt (renders only when user is authed and has no wallets) */}
        <WalletPromptBanner />
        <div className="ml-auto relative z-[9999]">
          <button
            onClick={async () => {
              try {
                const charityId = (user as any)?.charityId ?? (user as any)?.charity?.id
                if (!charityId) return alert('No charity associated with your account')
                const res = await api.get(`/charities/${charityId}/campaigns`)
                const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : [])
                setDisplayedCampaigns(list)
                setShowActive(true)
                // show dropdown immediately and fetch up-to-date on-chain balances
                setShowDropdown(true);

                // fetch per-campaign on-chain balances for the displayed list so the Raised amount
                // matches the campaign page (source-of-truth: GET /campaigns/{id}/balance)
                (async () => {
                  try {
                    const entries = await Promise.all((list || []).map(async (c: any) => {
                      try {
                        const b = await api.get(`/campaigns/${c.id}/balance`).then(r => r.data?.balance ?? r.data)
                        return [String(c.id), Number(b ?? 0)] as const
                      } catch {
                        return [String(c.id), 0] as const
                      }
                    }))
                    const map = Object.fromEntries(entries)
                    // merge with existing campaignBalances so other parts of the page keep working
                    setCampaignBalances(prev => ({ ...(prev ?? {}), ...map }))
                  } catch (err) {
                    // ignore - dropdown will fall back to server-provided fiat raised if present
                  }
                })()
                // small delay to allow dropdown render then scroll to it
                setTimeout(() => { try { document.getElementById('my-campaigns')?.scrollIntoView({ behavior: 'smooth' }) } catch {} }, 80)
              } catch (e: any) {
                alert(e?.response?.data?.message || e?.message || 'Failed to load campaigns')
              }
            }}
            className="btn-primary"
          >
            View Active Campaigns
          </button>

          {showDropdown && (
            <DropdownPanel
              campaigns={(displayedCampaigns ?? [])}
              campaignBalances={campaignBalances}
              price={price}
              onClose={() => setShowDropdown(false)}
            />
          )}
        </div>
      </div>

      {/* If summary includes campaigns, show them with donor totals */}
      {Array.isArray(summary?.campaigns) && (
        <section>
          <div className="flex items-center justify-between">
            <h2 id="my-campaigns" className="text-xl font-semibold mb-3">My Campaigns</h2>
            <div className="flex items-center gap-2">
              {/* Placeholder for actions */}
            </div>
          </div>
          <div className="space-y-3">
            {(displayedCampaigns ?? summary.campaigns).map((c: any) => (
              <div key={c.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.title}</div>
                    {/* Prefer server-provided fiat raised (INR). Otherwise convert on-chain ETH balance to INR */}
                    <div className="text-sm subtle">Raised: {formatINR(Number(c?.raised ?? 0) || (Number(campaignBalances[String(c.id)] ?? 0) * price) || 0, 0)}</div>
                    {/* Prefer server-provided goal fiat (goalFiat) if present, otherwise convert goalAmount (ETH) to INR for display */}
                    <div className="text-sm subtle">Goal: {typeof c?.goalFiat === 'number' ? formatINR(Number(c.goalFiat), 0) : (c.goalAmount ? formatINR(Number(c.goalAmount) * price, 0) : '—')}</div>
                    {/* Progress bar for each campaign using on-chain balance */}
                    <div className="mt-2">
                      {(() => {
                        // Compute progress using INR units so percentages make sense
                        const balEth = Number(campaignBalances[String(c.id)] ?? 0)
                        const balInr = Number(c?.raised ?? 0) || (balEth * price)
                        const goalInr = Number(c?.goalFiat ?? 0) || (Number(c.goalAmount ?? c.goal ?? 0) * price)
                        const pct = !goalInr || goalInr <= 0 ? 0 : Math.min(100, Math.round((balInr / goalInr) * 100))
                        return (
                          <div>
                            <div className="w-full bg-black/5 rounded-full h-2 overflow-hidden">
                              <div className="h-2 bg-gradient-to-r from-brand-500 to-emerald-500" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="text-xs subtle mt-1">{pct}% funded</div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
      <div className="flex flex-col items-end gap-2">
    <a href={`/campaign/${c.id}`} className="btn-ghost">View</a>
        <RequestWithdrawalButton campaign={c} user={user} />
                  </div>
                </div>
                    {Array.isArray(c.donations) && (
                  <div className="mt-3">
                    <div className="text-sm subtle mb-2">Donations</div>
                    <ul className="text-sm space-y-1">
                      {c.donations.map((d: any) => (
                        <li key={d.id} className="flex justify-between">
                          <span>{formatDateHuman(d.createdAt)} — {formatINR((Number(d.amount) || 0) * price, 0)}</span>
                          <span>{d.transactionHash ? <a target="_blank" rel="noreferrer" href={`https://sepolia.etherscan.io/tx/${d.transactionHash}`} className="text-brand-700 underline">{d.transactionHash}</a> : <span className="subtle">—</span>}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                </div>
            ))}
          </div>
          {/* raw debug removed - dropdown provides a readable list */}
        </section>
      )}

      {/* All Donations: show a combined list of donations across campaigns OR a top-level donations array if provided by the backend */}
      <section>
        <h2 className="text-xl font-semibold mb-3">All Donations</h2>
        <div className="space-y-3">
          <div className="card p-4">For full donation history, <a href="/dashboard/charity/donations" className="underline text-brand-700">click here</a>.</div>
        </div>
      </section>
    </div>
  )
}

function DropdownPanel({ campaigns, campaignBalances, price, onClose }: { campaigns: any[], campaignBalances: Record<string, number>, price: number, onClose: () => void }) {
  // Render a portal to body so the dropdown is never clipped by parent overflow/stacking contexts
  const el = (
    <div className="fixed top-20 right-6 w-[28rem] z-[99999]" onMouseLeave={() => onClose()}>
      <div className="card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Active campaigns</div>
          <button onClick={onClose} className="text-sm btn-ghost">Close</button>
        </div>
        <div className="space-y-2 max-h-72 overflow-auto">
          {(!campaigns || campaigns.length === 0) && <div className="text-sm subtle">No active campaigns</div>}
          {campaigns.map((c: any) => {
            const balEth = Number(campaignBalances[String(c.id)] ?? 0)
            const raisedInr = Number(c?.raised ?? 0) || (balEth * price) || 0
            const goalInr = Number(c?.goalFiat ?? 0) || (Number(c?.goalAmount ?? c?.goal ?? 0) * price) || 0
            const pct = !goalInr || goalInr <= 0 ? 0 : Math.min(100, Math.round((raisedInr / goalInr) * 100))
            return (
              <div key={c.id} className="p-2 border border-black/5 rounded">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.title}</div>
                    <div className="text-sm subtle">Raised: {formatINR(raisedInr, 0)}</div>
                    <div className="text-sm subtle">Goal: {goalInr ? formatINR(goalInr, 0) : '—'}</div>
                    <div className="mt-2">
                      <div className="w-full bg-black/5 rounded-full h-2 overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-brand-500 to-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs subtle mt-1">{pct}% funded</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-3">
                    <a href={`/campaign/${c.id}#donations`} className="btn-ghost text-sm">Open donors</a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(el, document.body)
}

function Card({ title, value, price }: { title: string, value: number, price?: number }) {
  // If a price is provided, display the value as INR (value is expected to be ETH)
  const display = typeof price === 'number' && isFinite(price) ? formatINR((Number(value) || 0) * price, 0) : undefined
  return (
    <div className="card p-4 transition-all hover:shadow-glass hover:-translate-y-0.5">
      <div className="text-sm subtle">{title}</div>
      <div className="text-2xl font-semibold mt-1">
        {display ? display : <CountUp end={Number(value) || 0} duration={0.8} decimals={value % 1 !== 0 ? 2 : 0} />}
      </div>
    </div>
  )
}

function CreateCampaignButton() {
  async function create() {
    const title = prompt('Campaign title?')
    const goalFiat = prompt('Goal amount (fiat, e.g. 5000 for INR)?')
    const description = prompt('Description?')
    if (!title || !goalFiat) return
    try {
      // Convert fiat goal to ETH using price feed (store goals in ETH)
      const price = await fetchEthPrice('inr')
      const goalEth = fiatToEth(Number(goalFiat), price)
      // Enforce minimum goal in fiat: ₹100
      if (Number(goalFiat) < 100) {
        alert('Minimum campaign goal is ₹100. Please increase your goal.')
        return
      }
      // Send both fiat and ETH values to backend: goalFiat (INR) and goalAmount (ETH) for compatibility.
      await api.post('/campaigns', { title, goalFiat: Number(goalFiat), goalAmount: goalEth, description })
      alert('Campaign created')
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || 'Failed')
    }
  }
  return <button onClick={create} className="btn-primary">Create New Campaign</button>
}

function CreatePostButton() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!text) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('text', text)
      if (file) fd.append('media', file)
      await api.post('/posts', fd)
      alert('Post created')
      setOpen(false)
      setText('')
      setFile(null)
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Fragment>
      <button onClick={() => setOpen(true)} className="btn-outline">Create New Post</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">Create Post</h3>
            <div>
              <label className="block text-sm mb-1">Text</label>
              <textarea value={text} onChange={e => setText(e.target.value)} className="input" rows={4} />
            </div>
            <div>
              <label className="block text-sm mb-1">Media (optional)</label>
              <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} className="block text-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button onClick={submit} disabled={loading} className="btn-primary disabled:opacity-60">{loading ? 'Posting...' : 'Post'}</button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  )
}

function RequestWithdrawalButton({ campaign, user }: { campaign: any, user: any }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const [vendorAddress, setVendorAddress] = useState('')
  const [financialFile, setFinancialFile] = useState<File | null>(null)
  const [visualFile, setVisualFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const hasWallet = Array.isArray(user?.wallets) && user.wallets.length > 0

  async function submit() {
    if (!amount || !purpose || !vendorAddress) {
      alert('Please provide amount, purpose and vendor address')
      return
    }
    if (!financialFile || !visualFile) {
      alert('Please upload both Financial Proof and Visual Proof files')
      return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      // The backend expects a JSON part named 'request' and file parts 'financialProof' and 'visualProof'
      const requestPayload = {
        campaignId: campaign.id,
        amount: String(amount),
        purpose,
        vendorAddress
      }
      fd.append('request', new Blob([JSON.stringify(requestPayload)], { type: 'application/json' }))
      fd.append('financialProof', financialFile)
      fd.append('visualProof', visualFile)
      // Post to canonical withdrawals endpoint
      await api.post(`/withdrawals`, fd)
      // Success feedback per spec
      setOpen(false)
      setAmount('')
      setPurpose('')
      setVendorAddress('')
      setFinancialFile(null)
      setVisualFile(null)
      try { router.refresh() } catch {}
      alert('Request submitted! It is now live for donor voting.')
    } catch (e: any) {
      // On failure, close modal and show backend message if available
      setOpen(false)
      const backendMsg = e?.response?.data?.message
      const msg = backendMsg || e?.message || 'Failed to submit withdrawal request'
      alert(msg)
      try { router.refresh() } catch {}
    } finally {
      setLoading(false)
    }
  }

  // If the charity admin has no registered wallets, the action must be disabled and
  // the global WalletPromptBanner (rendered at the top of the page) will guide them.
  if (!hasWallet) {
    return (
      <div className="flex flex-col items-end gap-2">
        <button disabled className="btn-outline text-xs opacity-50 cursor-not-allowed" title="Register a payout wallet to request withdrawals">Request Withdrawal</button>
      </div>
    )
  }

  return (
    <div>
      <button onClick={() => setOpen(true)} className="btn-outline text-xs">Request Withdrawal</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">Request Withdrawal — {campaign.title}</h3>

            <div>
              <label className="block text-sm mb-1">Amount (ETH)</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} className="input" placeholder="0.5" />
            </div>

            <div>
              <label className="block text-sm mb-1">Purpose</label>
              <textarea value={purpose} onChange={e => setPurpose(e.target.value)} className="input" rows={3} placeholder="Clear purpose for the funds (e.g., Purchase of 50 blankets)" />
            </div>

            <div>
              <label className="block text-sm mb-1">Vendor / Recipient Address (0x...)</label>
              <input value={vendorAddress} onChange={e => setVendorAddress(e.target.value)} className="input" placeholder="0x..." />
            </div>

            <div>
              <label className="block text-sm mb-1">Upload Financial Proof (Invoice, Quote, etc.)</label>
              <input type="file" onChange={e => setFinancialFile(e.target.files?.[0] ?? null)} className="block text-sm" />
            </div>

            <div>
              <label className="block text-sm mb-1">Upload Visual Proof (Photo of the need, e.g., 'the injured dog')</label>
              <input type="file" onChange={e => setVisualFile(e.target.files?.[0] ?? null)} className="block text-sm" />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button onClick={submit} disabled={loading} className="btn-primary disabled:opacity-60">{loading ? 'Submitting...' : 'Submit Request for Voting'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
