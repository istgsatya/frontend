"use client"
import useSWR from 'swr'
import { apiClient } from '@/lib/api'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/auth'
import { motion } from 'framer-motion'
import { useMemo } from 'react'

function fetcher(url: string) {
  return apiClient.get(url).then(r => r.data)
}

// Lightweight progress widget that fetches the on-chain/current balance for a campaign
function CampaignProgress({ id, goal }: { id: number | string; goal?: number | string }) {
  const { data } = useSWR(`/campaigns/${id}/balance`, fetcher)
  const toNum = (v: any) => {
    const n = Number(typeof v === 'object' ? (v?.balance ?? v?.data ?? 0) : v)
    return Number.isFinite(n) ? n : 0
  }
  const raised = toNum(data)
  const g = toNum(goal)
  const pct = g > 0 ? Math.max(0, Math.min(100, Math.round((raised / g) * 100))) : 0
  return (
    <div>
      <div className="h-2 w-full bg-slate-100 rounded overflow-hidden">
        <div className="h-2 bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-xs subtle">Raised {raised} of {g || '—'}</div>
    </div>
  )
}

export default function HomePage() {
  const isAuthed = useAuthStore(s => s.isAuthenticated)
  const { data, error, isLoading } = useSWR('/campaigns', fetcher)
  const { data: charities } = useSWR(isAuthed ? '/charities/approved' : null, fetcher)

  // Derive a small random subset (max 3) for the trending section
  const trendingCampaigns = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [] as any[]
    // Pick up to 3 unique random items
    const copy = [...data]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy.slice(0, Math.min(3, copy.length))
  }, [data])

  const campaignCount = Array.isArray(data) ? data.length : 0
  const charityCount = Array.isArray(charities) ? charities.length : 0

  // Friendly campaign title fallback for demo/placeholder data
  function normalizeTitle(raw: any, idx: number) {
    const s = String(raw || '').trim()
    const presets = [
      'Clean Water Initiative',
      'Build a School in Sundarbans',
      'Local Food Bank Drive',
      'Free Health Camp',
      'Reforest the Ridge'
    ]
    if (!s || s.length < 3 || /\b(q|w|e|r|t|y){3,}|\d{5,}|[^\w\s]/i.test(s)) {
      return presets[idx % presets.length]
    }
    return s
  }

  // Choose a stock illustration for each trending card
  const stockImages = ['/campaigns/c1.svg', '/campaigns/c2.svg', '/campaigns/c3.svg']

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
  }
  const list = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
  const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }

  return (
    <div className="relative space-y-16">
      {/* Global soft gradient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black" />
        <div className="absolute -top-32 -left-24 h-[34rem] w-[34rem] blur-3xl rounded-full bg-[radial-gradient(circle_at_center,_rgba(34,197,94,0.16),_transparent_60%)]" />
        <div className="absolute -bottom-40 -right-24 h-[36rem] w-[36rem] blur-3xl rounded-full bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.14),_transparent_60%)]" />
        {/* Background image layer for extra depth */}
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "url(/hero-bg.svg)", backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
      </div>
      {/* Authenticated charities section intentionally removed per request */}
      {/* Public Hero (only when logged out) */}
      {!isAuthed && (
      <section className="container pt-12 relative">
        {/* Decorative background blobs */}
        <div className="pointer-events-none select-none absolute -top-10 -left-10 h-56 w-56 bg-brand-400/20 blur-3xl rounded-full" />
        <div className="pointer-events-none select-none absolute -bottom-10 -right-10 h-56 w-56 bg-emerald-400/20 blur-3xl rounded-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight text-slate-100">
              <span>Join the Giving Revolution</span>
              <br />
              <span className="bg-gradient-to-r from-brand-600 via-emerald-600 to-sky-600 bg-clip-text text-transparent">Full transparency, on-chain.</span>
            </h1>
            <p className="mt-4 text-lg subtle">
              Transparent Cents is a blockchain-powered charity platform where every donation is tracked, verified, and visible.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link href="/signup" className="btn-primary">Get Started</Link>
              <Link href="#how" className="btn-ghost">How it works</Link>
            </div>
            <div className="mt-6 flex items-center gap-4 text-xs subtle">
              <span className="badge">Secure</span>
              <span className="badge">Auditable</span>
              <span className="badge">Community Voting</span>
            </div>

            {/* Live stats */}
            {charityCount > 0 && (
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-slate-100">{campaignCount}</div>
                  <div className="text-xs subtle">Active Campaigns</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-slate-100">{charityCount}</div>
                  <div className="text-xs subtle">Approved Charities</div>
                </div>
                <div className="card p-4 text-center hidden sm:block">
                  <div className="text-2xl font-bold text-slate-100">On‑chain</div>
                  <div className="text-xs subtle">Verifiable Impact</div>
                </div>
              </div>
            )}
          </motion.div>
          <motion.div
            className="hidden lg:block"
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            animate={{ y: [0, -8, 0] }}
            whileHover={{ y: -4 }}
            // Loop the gentle float animation
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="glass-deeper hero-bg rounded-2xl p-6 h-full flex items-center justify-center">
              <svg width="320" height="200" viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="16" y="16" width="288" height="168" rx="16" className="fill-white/10" />
                <rect x="32" y="40" width="80" height="12" rx="6" className="fill-brand-500/80" />
                <rect x="32" y="64" width="200" height="8" rx="4" className="fill-white/15" />
                <rect x="32" y="80" width="240" height="8" rx="4" className="fill-white/15" />
                <rect x="32" y="120" width="120" height="12" rx="6" className="fill-emerald-500/80" />
                <rect x="32" y="144" width="180" height="8" rx="4" className="fill-white/15" />
              </svg>
            </div>
          </motion.div>
        </div>
  </section>
  )}

  {!isAuthed && (
  <section className="container" id="features">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-100">Built for radical transparency</h2>
          <p className="mt-2 subtle">Everything you need to build trust and drive impact.</p>
        </div>
        <motion.div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5" variants={list} initial="hidden" whileInView="show" viewport={{ once: true }}>
          {[
            { title: 'On-chain Tracking', desc: 'Every donation recorded on Ethereum for full auditability.' },
            { title: 'Real-time Proofs', desc: 'Charities attach financial and visual proofs to withdrawals.' },
            { title: 'Community Voting', desc: 'Donors vote on fund releases to ensure accountability.' }
          ].map((f) => (
            <motion.div key={f.title} variants={item} className="card p-5 transition-all hover:-translate-y-0.5 hover:shadow-glass">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand-200 via-emerald-200 to-violet-200 text-brand-700 flex items-center justify-center mb-3">✓</div>
              <div className="font-semibold">{f.title}</div>
              <p className="subtle mt-1">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
  </section>
  )}

  {!isAuthed && (
  <section className="container" id="how">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-100">How it works</h2>
          <p className="mt-2 subtle">From donation to impact in three simple steps.</p>
        </div>
        <motion.div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5" variants={list} initial="hidden" whileInView="show" viewport={{ once: true }}>
          {[
            { step: '1', title: 'Donate', desc: 'Support a campaign using crypto; your tx is recorded on-chain.' },
            { step: '2', title: 'Vote', desc: 'Help approve withdrawals and guide how funds are used.' },
            { step: '3', title: 'Verify', desc: 'Review proofs and see undeniable impact, transparently.' }
          ].map((s) => (
            <motion.div key={s.step} variants={item} className="card p-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-glass">
              <div className="mx-auto h-10 w-10 rounded-full bg-brand-600 text-white flex items-center justify-center mb-3">{s.step}</div>
              <div className="font-semibold">{s.title}</div>
              <p className="subtle mt-1">{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
  </section>
  )}

  {!isAuthed && (
  <section className="container" id="testimonials">
        <div className="glass rounded-2xl p-6">
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-5" variants={list} initial="hidden" whileInView="show" viewport={{ once: true }}>
            {[
              { quote: 'I finally see exactly where my money goes.', name: 'Ananya, Donor' },
              { quote: 'It’s never been easier to build trust with donors.', name: 'Ravi, Charity Admin' },
              { quote: 'A new standard for transparency in giving.', name: 'Neha, Philanthropist' }
            ].map(t => (
              <motion.div key={t.name} variants={item} className="card p-5 transition-all hover:-translate-y-0.5 hover:shadow-glass">
                <p className="italic">“{t.quote}”</p>
                <div className="mt-3 text-sm font-medium">{t.name}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
  </section>
  )}

      

      {/* Trending campaigns */}
      <section className="container" id="trending">
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-2xl font-semibold text-slate-100">Trending Campaigns</h2>
          <div />
        </div>
        {isLoading && <div className="subtle">Loading campaigns...</div>}
        {error && <div className="subtle">Failed to load.</div>}
        <motion.div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" variants={list} initial="hidden" animate="show">
          {trendingCampaigns?.map((c: any, idx: number) => (
            <motion.div key={c.id} variants={item} className="overflow-hidden">
              <div className="card p-0 transition-all hover:-translate-y-0.5 hover:shadow-glass">
                {/* Visual */}
                <Link href={`/campaign/${c.id}`} className="block">
                  <div className="h-40 w-full overflow-hidden">
                    <img src={stockImages[idx % stockImages.length]} alt="Campaign image" className="h-full w-full object-cover" />
                  </div>
                </Link>
                {/* Content */}
                <div className="p-5">
                  <div className="font-semibold text-slate-100 mb-1">{normalizeTitle(c.title, idx)}</div>
                  <div className="text-sm subtle">Charity: {c.charityName || 'Partner Charity'}</div>
                  <div className="mt-3">
                    {/* Progress */}
                    <CampaignProgress id={c.id} goal={c.goal} />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link href={`/campaign/${c.id}`} className="btn-primary">View Campaign</Link>
                    <Link href={`/campaign/${c.id}`} className="btn-ghost">Donate</Link>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Impact Delivered / Success Stories */}
      <section className="container" id="impact">
        <div className="glass rounded-2xl p-6">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1">
              <h3 className="text-xl font-semibold">Impact Delivered</h3>
              <p className="subtle mt-1">See how transparency builds trust. Every completed campaign includes verifiable on‑chain proof of withdrawal.</p>
              <ul className="mt-3 text-sm list-disc ml-5 space-y-1">
                <li>School Roof Repair — ₹8.4L raised. <a className="text-brand-700 underline" href="#">See proof</a></li>
                <li>Community Clinic — ₹3.2L raised. <a className="text-brand-700 underline" href="#">Verify transaction</a></li>
              </ul>
            </div>
            <div className="flex-1">
              <div className="card p-5">
                <div className="font-medium">“I finally see exactly where my money goes.”</div>
                <div className="text-xs subtle mt-1">Ananya, Donor</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Charities CTA */}
      <section className="container" id="for-charities">
        <div className="glass rounded-2xl p-6 text-center">
          <h3 className="text-xl font-semibold">For Charities</h3>
          <p className="subtle mt-1">Join Transparent Cents to build trust with donors through real‑time proofs and community voting.</p>
          <div className="mt-4">
            <Link href="/signup" className="btn-primary">Register Your Charity</Link>
            <Link href="/contact" className="btn-ghost ml-2">Learn More</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
