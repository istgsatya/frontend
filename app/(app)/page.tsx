"use client"
import useSWR from 'swr'
import { apiClient } from '@/lib/api'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/auth'
import { motion } from 'framer-motion'

function fetcher(url: string) {
  return apiClient.get(url).then(r => r.data)
}

export default function HomePage() {
  const isAuthed = useAuthStore(s => s.isAuthenticated)
  const { data, error, isLoading } = useSWR('/campaigns', fetcher)
  const { data: charities } = useSWR(isAuthed ? '/charities/approved' : null, fetcher)

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
  }
  const list = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
  const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }

  return (
    <div className="space-y-16">
      {/* Authenticated: Charity River */}
      {isAuthed ? (
        <section className="container pt-8">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-2xl font-semibold">Charities</h2>
            <Link href="/browse/charities" className="btn-ghost">Browse All</Link>
          </div>
          {!charities && <div className="subtle">Loading charities...</div>}
          {Array.isArray(charities) && (
            <motion.div
              variants={list}
              initial="hidden"
              animate="show"
              className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            >
              {charities.map((ch: any) => (
                <motion.div variants={item} key={ch.id}>
                  <Link href={`/charity/${ch.id}`} className="card p-5 transition-all hover:-translate-y-0.5 hover:shadow-glass">
                    <div className="font-semibold text-slate-900 mb-1">{ch.name}</div>
                    <div className="text-sm subtle line-clamp-3">{ch.description}</div>
                    <div className="mt-4 inline-flex items-center text-brand-700 text-sm font-medium">View Charity →</div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      ) : null}
      {/* Public Hero (only when logged out) */}
      {!isAuthed && (
      <section className="container pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
              Join the Giving Revolution
              <br /> Full transparency, on-chain.
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
          </motion.div>
          <motion.div className="hidden lg:block" initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
            <div className="glass-deeper hero-bg rounded-2xl p-6 h-full flex items-center justify-center">
              <svg width="320" height="200" viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="16" y="16" width="288" height="168" rx="16" className="fill-white/70" />
                <rect x="32" y="40" width="80" height="12" rx="6" className="fill-brand-500/80" />
                <rect x="32" y="64" width="200" height="8" rx="4" className="fill-black/10" />
                <rect x="32" y="80" width="240" height="8" rx="4" className="fill-black/10" />
                <rect x="32" y="120" width="120" height="12" rx="6" className="fill-emerald-500/80" />
                <rect x="32" y="144" width="180" height="8" rx="4" className="fill-black/10" />
              </svg>
            </div>
          </motion.div>
        </div>
  </section>
  )}

  {!isAuthed && (
  <section className="container" id="features">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold">Built for radical transparency</h2>
          <p className="mt-2 subtle">Everything you need to build trust and drive impact.</p>
        </div>
        <motion.div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5" variants={list} initial="hidden" whileInView="show" viewport={{ once: true }}>
          {[
            { title: 'On-chain Tracking', desc: 'Every donation recorded on Ethereum for full auditability.' },
            { title: 'Real-time Proofs', desc: 'Charities attach financial and visual proofs to withdrawals.' },
            { title: 'Community Voting', desc: 'Donors vote on fund releases to ensure accountability.' }
          ].map((f) => (
            <motion.div key={f.title} variants={item} className="card p-5 transition-all hover:-translate-y-0.5 hover:shadow-glass">
              <div className="h-10 w-10 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center mb-3">✓</div>
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
          <h2 className="text-3xl font-bold">How it works</h2>
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
          <h2 className="text-2xl font-semibold">Trending Campaigns</h2>
          <Link href="/" className="btn-ghost">Refresh</Link>
        </div>
        {isLoading && <div className="subtle">Loading campaigns...</div>}
        {error && <div className="subtle">Failed to load.</div>}
        <motion.div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" variants={list} initial="hidden" animate="show">
          {data?.map((c: any) => (
            <motion.div key={c.id} variants={item}>
              <Link href={`/campaign/${c.id}`} className="card p-5 transition-all hover:-translate-y-0.5 hover:shadow-glass">
                <div className="font-semibold text-slate-900 mb-1">{c.title}</div>
                <div className="text-sm subtle">Charity: {c.charityName}</div>
                <div className="text-sm subtle">Goal: {c.goal}</div>
                <div className="mt-4 inline-flex items-center text-brand-700 text-sm font-medium">View Details →</div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  )
}
