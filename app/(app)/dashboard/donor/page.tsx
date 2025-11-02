"use client"
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export default function DonorDashboard() {
  const [summary, setSummary] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [s, h] = await Promise.all([
          api.get('/dashboard/donor').then(r => r.data),
          api.get('/donations/me').then(r => r.data)
        ])
        setSummary(s)
        setHistory(h)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <div className="container py-10">Loading...</div>

  return (
    <div className="container py-6 space-y-8">
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card title="Total Donated" value={summary?.totalDonated ?? 0} />
        <Card title="Campaigns Supported" value={summary?.campaignsSupported ?? 0} />
        <Card title="Votes Cast" value={summary?.votesCast ?? 0} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Donation History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 border">Date</th>
                <th className="text-left p-2 border">Campaign</th>
                <th className="text-left p-2 border">Amount</th>
              </tr>
            </thead>
            <tbody>
              {history.map((d) => (
                <tr key={d.id} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2 border">{new Date(d.createdAt).toLocaleString()}</td>
                  <td className="p-2 border">{d.campaignTitle}</td>
                  <td className="p-2 border">{d.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
