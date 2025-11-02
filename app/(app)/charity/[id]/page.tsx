"use client"
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useParams } from 'next/navigation'

export default function CharityProfile() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [detail, setDetail] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) return <div className="container py-10">Loading...</div>
  if (!detail) return <div className="container py-10">Not found.</div>

  return (
    <div className="container py-6 space-y-8">
      <section>
        <h1 className="text-2xl font-semibold">{detail.name}</h1>
        <p className="text-gray-700">{detail.description}</p>
      </section>

      {detail.campaigns?.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Campaigns</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {detail.campaigns.map((c: any) => (
              <a key={c.id} href={`/campaign/${c.id}`} className="border rounded p-4 hover:shadow">
                <div className="font-medium">{c.title}</div>
                <div className="text-sm text-gray-600">Goal: {c.goal}</div>
              </a>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3">Social Feed</h2>
        <div className="space-y-4">
          {posts.map((p) => (
            <div key={p.id} className="border rounded p-4 space-y-2">
              <div className="text-sm text-gray-600">{new Date(p.createdAt).toLocaleString()}</div>
              <div>{p.text}</div>
              {p.mediaUrl && (
                <img src={`http://localhost:8080/uploads/${p.mediaUrl}`} alt="post" className="rounded max-h-96 object-cover" />
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
