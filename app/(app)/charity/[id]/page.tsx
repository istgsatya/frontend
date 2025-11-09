"use client"
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatDateHuman, formatINR } from '@/lib/format'
import { fetchEthPrice } from '@/lib/price'
import { useParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'

export default function CharityProfile() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [detail, setDetail] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [charityCampaigns, setCharityCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'social' | 'campaigns'>('social')
  const [price, setPrice] = useState<number>(0)
  const list = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
  const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }

  function CampaignCard({ campaign }: { campaign: any }) {
    const goal = campaign?.goalAmount ?? campaign?.goal ?? 0
    return (
      <Link href={`/campaign/${campaign.id}`} className="card p-4 transition-all hover:-translate-y-0.5 hover:shadow-glass">
        <div className="font-medium">{campaign.title}</div>
        <div className="text-sm subtle mt-2">Goal: {formatINR(Number(goal) || 0, 0)}</div>
      </Link>
    )
  }

  useEffect(() => {
    (async () => {
      try {
        // fetch public charity detail, posts, and the new charity-specific campaigns endpoint in parallel
        const [d, p, cc] = await Promise.all([
          api.get(`/charities/${id}/public`).then(r => r.data),
          api.get(`/charities/${id}/posts`).then(r => r.data),
          api.get(`/charities/${id}/campaigns`).then(r => r.data),
        ])
        setDetail(d)
        setPosts(p)

        // Set the dedicated charity campaigns (from new endpoint). Ensure we have an array.
        setCharityCampaigns(Array.isArray(cc) ? cc : [])

        // Backwards-compatible: existing 'campaigns' state is still populated from
        // the public DTO or a fallback query. Prefer the explicit campaigns list
        // from the public DTO if present, otherwise try the old /campaigns?charityId
        // query and finally empty array.
        if (Array.isArray(d?.campaigns) && d.campaigns.length > 0) {
          setCampaigns(d.campaigns)
        } else {
          try {
            const res = await api.get(`/campaigns?charityId=${id}`).then(r => r.data)
            setCampaigns(Array.isArray(res) ? res : [])
          } catch {
            setCampaigns([])
          }
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  // Periodically refresh charity public detail and charity-specific campaigns so
  // the "Total Raised" and per-campaign "Raised" values reflect new donations.
  useEffect(() => {
    if (!id) return

    let mounted = true
    async function refreshCharityData() {
      try {
        const [d, cc] = await Promise.all([
          api.get(`/charities/${id}/public`).then(r => r.data),
          api.get(`/charities/${id}/campaigns`).then(r => r.data),
        ])
        if (!mounted) return
        if (d) setDetail(d)
        setCharityCampaigns(Array.isArray(cc) ? cc : [])
      } catch (e) {
        // ignore transient errors during polling
      }
    }

    // initial refresh immediately after mount
    refreshCharityData().catch(() => {})

    const iv = setInterval(() => {
      refreshCharityData().catch(() => {})
    }, 10_000) // refresh every 10s

    return () => {
      mounted = false
      clearInterval(iv)
    }
  }, [id])

  useEffect(() => {
    // fetch INR price for ETH so we can display fiat values for campaign goals/raised when needed
    fetchEthPrice('inr').then(setPrice).catch(() => setPrice(0))
  }, [])

  if (loading) return <div className="container py-10"><div className="subtle">Loading...</div></div>
  if (!detail) return <div className="container py-10"><div className="subtle">Not found.</div></div>

  // helper to compute raised amount (INR) for a campaign consistently
  const getRaisedInr = (c: any) => {
    // support multiple possible backend fields: prefer server-provided INR totals
    const serverRaised = Number(c?.raised ?? c?.amountRaised ?? c?.raisedFiat ?? 0)
    if (serverRaised && serverRaised > 0) return serverRaised
    // fallback: if backend provides an ETH-denominated field, convert to INR
    const ethVal = Number(c?.raisedAmount ?? c?.amountRaised ?? c?.raised ?? 0)
    return (price && ethVal) ? (ethVal * price) : 0
  }

  // compute total raised across campaigns created by this charity (sum of per-campaign raised)
  const totalRaised = (Array.isArray(charityCampaigns) ? charityCampaigns.reduce((sum: number, c: any) => {
    return sum + getRaisedInr(c)
  }, 0) : 0)

  return (
    <div className="container py-6 space-y-8">
      <section>
        <div className="card p-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{detail.name}</h1>
            <p className="text-slate-700 mt-2">{detail.description}</p>
          </div>
          <div className="text-right">
            <div className="text-sm subtle">Total Raised</div>
            <div className="text-2xl font-semibold">{formatINR(Number(totalRaised) || 0, 0)}</div>
          </div>
        </div>
      </section>

      {/* Removed standalone campaigns section - merged into Active Campaigns tab */}

      {/* Tabs */}
      <section>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('social')}
            className={`px-3 py-1 rounded-md ${activeTab === 'social' ? 'bg-brand-600 text-white' : 'bg-transparent border border-transparent text-slate-800'}`}
          >
            Social Feed
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-3 py-1 rounded-md ${activeTab === 'campaigns' ? 'bg-brand-600 text-white' : 'bg-transparent border border-transparent text-slate-800'}`}
          >
            {`Active Campaigns by ${detail?.name || ''}`}
          </button>
        </div>
      </section>

      {activeTab === 'campaigns' ? (
        <section>
    <h2 className="text-xl font-semibold mb-3">{`Active Campaigns by ${detail?.name || ''}`}</h2>
          {Array.isArray(charityCampaigns) && charityCampaigns.length > 0 ? (
            <motion.div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" variants={list} initial="hidden" whileInView="show" viewport={{ once: true }}>
              {charityCampaigns.map((c: any) => {
                const raisedInr = getRaisedInr(c)
                const goalInr = c?.goalFiat
                  ? Number(c.goalFiat)
                  : (Number(c?.goalAmount ?? c?.targetAmount ?? c?.goal ?? 0) * (price || 0))
                return (
                  <motion.a key={c.id} variants={item} href={`/campaign/${c.id}`} className="card p-5 transition-all hover:-translate-y-0.5 hover:shadow-glass">
                    <div className="font-medium">{c.title}</div>
                    <div className="text-sm subtle mt-2">{c.summary || c.description}</div>
                    <div className="mt-3 text-sm subtle">Raised: {formatINR(Number(raisedInr) || 0, 0)}</div>
                    <div className="text-sm subtle">Goal: {goalInr ? formatINR(Number(goalInr) || 0, 0) : '—'}</div>
                  </motion.a>
                )
              })}
            </motion.div>
          ) : (
            <div className="subtle">No active campaigns found for this charity.</div>
          )}
        </section>
      ) : (
        <section>
          <h2 className="text-xl font-semibold mb-3">Social Feed</h2>
          <motion.div className="space-y-4" variants={list} initial="hidden" animate="show">
            {posts.map((p) => (
              <motion.div key={p.id} variants={item} className="card p-4 space-y-2">
                <div className="text-sm subtle">{formatDateHuman(p.createdAt)}</div>
                <div>{p.text}</div>
                {p.mediaUrl && (
                  <img
                    src={`http://localhost:8080/uploads/${p.mediaUrl}`}
                    alt="post"
                    className="rounded-xl max-h-96 object-cover w-full cursor-zoom-in"
                    onClick={() => setLightbox(`http://localhost:8080/uploads/${p.mediaUrl}`)}
                  />
                )}
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <motion.img
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              src={lightbox}
              alt="media"
              className="max-h-[85vh] w-auto rounded-xl shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
