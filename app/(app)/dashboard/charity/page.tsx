"use client"
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth'
import { useRouter } from 'next/navigation'

export default function CharityDashboard() {
  const user = useAuthStore(s => s.user)
  const router = useRouter()
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const isAdmin = user.roles?.includes('ROLE_CHARITY_ADMIN')
    if (!isAdmin) {
      router.replace('/')
      return
    }
    ;(async () => {
      try {
        const s = await api.get('/dashboard/charity').then(r => r.data)
        setSummary(s)
      } finally {
        setLoading(false)
      }
    })()
  }, [user, router])

  if (loading) return <div className="container py-10">Loading...</div>

  return (
    <div className="container py-6 space-y-8">
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card title="Total Raised" value={summary?.totalRaised ?? 0} />
        <Card title="Active Campaigns" value={summary?.activeCampaigns ?? 0} />
        <Card title="Pending Withdrawals" value={summary?.pendingWithdrawals ?? 0} />
      </section>

      <div className="flex gap-2">
        <CreateCampaignButton />
        <CreatePostButton />
      </div>

      {/* TODO: detailed view of campaigns and withdrawal statuses */}
    </div>
  )
}

function Card({ title, value }: { title: string, value: number }) {
  return (
    <div className="rounded border p-4">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}

function CreateCampaignButton() {
  async function create() {
    const title = prompt('Campaign title?')
    const goalAmount = prompt('Goal amount?')
    const description = prompt('Description?')
    if (!title || !goalAmount) return
    try {
      await api.post('/campaigns', { title, goalAmount, description })
      alert('Campaign created')
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || 'Failed')
    }
  }
  return <button onClick={create} className="px-3 py-2 rounded bg-brand-600 text-white hover:bg-brand-700">Create New Campaign</button>
}

function CreatePostButton() {
  async function create() {
    const text = prompt('Post text?')
    if (!text) return
    try {
      const fd = new FormData()
      fd.append('text', text)
      await api.post('/posts', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      alert('Post created')
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || 'Failed')
    }
  }
  return <button onClick={create} className="px-3 py-2 rounded border">Create New Post</button>
}
