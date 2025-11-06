"use client"
import { Fragment, useEffect, useState } from 'react'
import useSWR from 'swr'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth'
import { useRouter } from 'next/navigation'
import CountUp from 'react-countup'
import { fetchEthPrice, fiatToEth } from '@/lib/price'

const fetcher = (url: string) => api.get(url).then(r => r.data)

export default function CharityDashboard() {
  const user = useAuthStore(s => s.user)
  const router = useRouter()

  const [campaignBalances, setCampaignBalances] = useState<Record<string, number>>({})
  const [totalRaisedReal, setTotalRaisedReal] = useState<number>(0)

  useEffect(() => {
    if (!user) return
    const isAdmin = (user as any)?.roles?.includes('ROLE_CHARITY_ADMIN')
    if (!isAdmin) {
      router.replace('/')
      return
    }
  }, [user, router])

  const { data: summary } = useSWR(user ? '/dashboard/charity' : null, fetcher, { refreshInterval: 7000 })
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
        const total = Object.values(map).reduce((s, n) => s + (Number(n) || 0), 0)
        setTotalRaisedReal(total)
      } catch {
        if (!mounted) return
      }
    }

    fetchBalances()
    const iv = setInterval(fetchBalances, 7000)
    return () => { mounted = false; clearInterval(iv) }
  }, [summary?.campaigns])

  if (!summary) return <div className="container py-10">Loading...</div>

  return (
    <div className="container py-6 space-y-8">
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card title="Total Raised" value={typeof totalRaisedReal === 'number' && totalRaisedReal > 0 ? totalRaisedReal : (summary?.totalRaised ?? 0)} />
        <Card title="Active Campaigns" value={summary?.activeCampaigns ?? 0} />
        <Card title="Pending Withdrawals" value={summary?.pendingWithdrawals ?? 0} />
      </section>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <CreateCampaignButton />
        <CreatePostButton />
      </div>

      {/* If summary includes campaigns, show them with donor totals */}
      {Array.isArray(summary?.campaigns) && (
        <section>
          <h2 className="text-xl font-semibold mb-3">My Campaigns</h2>
          <div className="space-y-3">
            {summary.campaigns.map((c: any) => (
              <div key={c.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.title}</div>
                    <div className="text-sm subtle">Raised: {typeof campaignBalances[String(c.id)] === 'number' ? `${campaignBalances[String(c.id)].toFixed(6)} ETH` : (c.raised ?? c.amountRaised ?? 0)}</div>
                    <div className="text-sm subtle">Goal: {c.goal ?? c.goalAmount ?? '—'}</div>
                    {/* Progress bar for each campaign using on-chain balance */}
                    <div className="mt-2">
                      {(() => {
                        const bal = Number(campaignBalances[String(c.id)] ?? (c.raised ?? c.amountRaised ?? 0))
                        const goal = Number(c.goal ?? c.goalAmount ?? 0)
                        const pct = !goal || goal <= 0 ? 0 : Math.min(100, Math.round((bal / goal) * 100))
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
                    <RequestWithdrawalButton campaign={c} />
                  </div>
                </div>
                {Array.isArray(c.donations) && (
                  <div className="mt-3">
                    <div className="text-sm subtle mb-2">Donations</div>
                    <ul className="text-sm space-y-1">
                      {c.donations.map((d: any) => (
                        <li key={d.id} className="flex justify-between">
                          <span>{new Date(d.createdAt).toLocaleString()} — {d.amount}</span>
                          <span>{d.transactionHash ? <a target="_blank" rel="noreferrer" href={`https://sepolia.etherscan.io/tx/${d.transactionHash}`} className="text-brand-700 underline">{d.transactionHash}</a> : <span className="subtle">—</span>}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Donations: show a combined list of donations across campaigns OR a top-level donations array if provided by the backend */}
      <section>
        <h2 className="text-xl font-semibold mb-3">All Donations</h2>
        <div className="space-y-3">
          {(() => {
            // Prefer backend-provided flat donations list if present
            const flat: any[] = Array.isArray(summary?.donations)
              ? summary.donations
              : // otherwise aggregate donations from each campaign
                (Array.isArray(summary?.campaigns) ? summary.campaigns.flatMap((c: any) => Array.isArray(c.donations) ? c.donations.map((d: any) => ({ ...d, campaignTitle: c.title, campaignId: c.id })) : []) : [])

            if (!flat || flat.length === 0) return <div className="text-sm subtle">No donations yet</div>

            // sort newest first
            flat.sort((a, b) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))

            return (
              <div className="card p-4">
                <ul className="space-y-2 text-sm">
                  {flat.map((d: any) => (
                    <li key={d.id || `${d.transactionHash}-${d.createdAt}`} className="flex justify-between items-start">
                      <div className="max-w-lg">
                        <div className="font-medium">{d.donorName ?? d.from ?? d.wallet ?? 'Anonymous'}</div>
                        <div className="subtle text-xs">{new Date(d.createdAt).toLocaleString()} • {d.campaignTitle ? <a className="underline text-brand-700" href={`/campaign/${d.campaignId}`}>{d.campaignTitle}</a> : null}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{d.amount}</div>
                        <div className="text-xs mt-1">{d.transactionHash ? <a target="_blank" rel="noreferrer" href={`https://sepolia.etherscan.io/tx/${d.transactionHash}`} className="underline text-brand-700">{d.transactionHash}</a> : <span className="subtle">—</span>}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })()}
        </div>
      </section>
    </div>
  )
}

function Card({ title, value }: { title: string, value: number }) {
  return (
    <div className="card p-4 transition-all hover:shadow-glass hover:-translate-y-0.5">
      <div className="text-sm subtle">{title}</div>
      <div className="text-2xl font-semibold mt-1">
        <CountUp end={Number(value) || 0} duration={0.8} decimals={value % 1 !== 0 ? 2 : 0} />
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
      // Send ETH value to backend so it stores goal in ETH
      await api.post('/campaigns', { title, goalAmount: goalEth, description })
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

function RequestWithdrawalButton({ campaign }: { campaign: any }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const [vendorAddress, setVendorAddress] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function submit() {
    if (!amount || !purpose || !vendorAddress) return alert('Please provide amount, purpose and vendor address')
    setLoading(true)
    try {
      const fd = new FormData()
      // The backend expects a JSON part named 'request' and a file part 'financialProof'
      const requestPayload = {
        campaignId: campaign.id,
        amount,
        purpose,
        vendorAddress
      }
      fd.append('request', new Blob([JSON.stringify(requestPayload)], { type: 'application/json' }))
      if (file) fd.append('financialProof', file)
      // Post to canonical withdrawals endpoint
      await api.post(`/withdrawals`, fd)
      alert('Withdrawal request submitted')
      setOpen(false)
      setAmount('')
      setPurpose('')
      setVendorAddress('')
      setFile(null)
      // refresh the page data
      try { router.refresh() } catch {}
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={() => setOpen(true)} className="btn-outline text-xs">Request Withdrawal</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold">Request Withdrawal — {campaign.title}</h3>
            <div>
              <label className="block text-sm mb-1">Amount (ETH)</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} className="input" placeholder="0.5" />
            </div>
            <div>
              <label className="block text-sm mb-1">Purpose</label>
              <input value={purpose} onChange={e => setPurpose(e.target.value)} className="input" placeholder="Purpose for withdrawal" />
            </div>
            <div>
              <label className="block text-sm mb-1">Vendor Address</label>
              <input value={vendorAddress} onChange={e => setVendorAddress(e.target.value)} className="input" placeholder="0x..." />
            </div>
            <div>
              <label className="block text-sm mb-1">Financial Proof (optional)</label>
              <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} className="block text-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button onClick={submit} disabled={loading} className="btn-primary disabled:opacity-60">{loading ? 'Submitting...' : 'Submit'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
