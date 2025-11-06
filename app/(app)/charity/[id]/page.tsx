"use client"
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'

export default function CharityProfile() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [detail, setDetail] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const list = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
  const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }

  useEffect(() => {
    (async () => {
      try {
        const [d, p] = await Promise.all([
          api.get(`/charities/${id}/public`).then(r => r.data),
          api.get(`/charities/${id}/posts`).then(r => r.data),
        ])
        setDetail(d)
        setPosts(p)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) return <div className="container py-10"><div className="subtle">Loading...</div></div>
  if (!detail) return <div className="container py-10"><div className="subtle">Not found.</div></div>

  return (
    <div className="container py-6 space-y-8">
      <section>
        <div className="card p-6">
          <h1 className="text-2xl font-semibold">{detail.name}</h1>
          <p className="text-slate-700 mt-2">{detail.description}</p>
        </div>
      </section>

      {detail.campaigns?.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Campaigns</h2>
          <motion.div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" variants={list} initial="hidden" whileInView="show" viewport={{ once: true }}>
            {detail.campaigns.map((c: any) => (
              <motion.a key={c.id} variants={item} href={`/campaign/${c.id}`} className="card p-5 transition-all hover:-translate-y-0.5 hover:shadow-glass">
                <div className="font-medium">{c.title}</div>
                <div className="text-sm subtle">Goal: {c.goal}</div>
              </motion.a>
            ))}
          </motion.div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3">Social Feed</h2>
        <motion.div className="space-y-4" variants={list} initial="hidden" animate="show">
          {posts.map((p) => (
            <motion.div key={p.id} variants={item} className="card p-4 space-y-2">
              <div className="text-sm subtle">{new Date(p.createdAt).toLocaleString()}</div>
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
