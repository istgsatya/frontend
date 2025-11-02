"use client"
import useSWR from 'swr'
import { api } from '@/lib/api'
import Link from 'next/link'

function fetcher(url: string) {
  return api.get(url).then(r => r.data)
}

export default function HomePage() {
  const { data, error, isLoading } = useSWR('/campaigns', fetcher)

  if (isLoading) return <div className="container py-10">Loading campaigns...</div>
  if (error) return <div className="container py-10">Failed to load.</div>

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-semibold mb-4">Campaigns</h1>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((c: any) => (
          <Link key={c.id} href={`/campaign/${c.id}`} className="border rounded p-4 hover:shadow">
            <div className="font-medium">{c.title}</div>
            <div className="text-sm text-gray-600">Charity: {c.charityName}</div>
            <div className="text-sm text-gray-600">Goal: {c.goal}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
