"use client"
import { useState } from 'react'
import useSWR from 'swr'
import { api } from '@/lib/api'
import { formatDateHuman, formatEth } from '@/lib/format'
import useSWRImmutable from 'swr/immutable'
import { useAuthStore } from '@/lib/store/auth'

const fetcher = (url: string) => api.get(url).then(r => r.data)

export default function MyAccountPage() {
  const user = useAuthStore(s => s.user)
  const { data: summary } = useSWR('/dashboard/donor', fetcher)
  const { data: history } = useSWR('/donations/me', fetcher)
  const [tab, setTab] = useState<'dashboard' | 'details'>('dashboard')

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Account</h1>
        <div className="inline-flex bg-black/5 rounded-lg p-1">
          <button onClick={() => setTab('dashboard')} className={`px-3 py-1.5 rounded-md text-sm ${tab==='dashboard' ? 'bg-white shadow-soft' : ''}`}>Dashboard</button>
          <button onClick={() => setTab('details')} className={`px-3 py-1.5 rounded-md text-sm ${tab==='details' ? 'bg-white shadow-soft' : ''}`}>My Details</button>
        </div>
      </div>

      {tab === 'dashboard' && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard title="Total Donated" value={summary?.totalDonated ?? 0} />
            <MetricCard title="Campaigns Supported" value={summary?.campaignsSupported ?? 0} />
            <MetricCard title="Votes Cast" value={summary?.votesCast ?? 0} />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Recent Donations</h2>
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-black/5">
                    <tr>
                      <th className="text-left px-4 py-2">Date</th>
                      <th className="text-left px-4 py-2">Campaign</th>
                      <th className="text-left px-4 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history?.map((d: any) => (
                      <tr key={d.id} className="border-t border-black/5">
                        <td className="px-4 py-2 subtle">{formatDateHuman(d.createdAt)}</td>
                        <td className="px-4 py-2">{d.campaignTitle}</td>
                        <td className="px-4 py-2">{formatEth(d.amount, 6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}

          {tab === 'details' && (
            <div className="space-y-3">
              <CharityStatus />
              <div className="card p-6 space-y-3">
                <div><span className="subtle">Username:</span> <span className="font-medium">{user?.username}</span></div>
                <div><span className="subtle">Email:</span> <span className="font-medium">{user?.email}</span></div>
                {typeof (user as any)?.trustPoints !== 'undefined' && (
                  <div><span className="subtle">Trust Points:</span> <span className="font-medium">{(user as any)?.trustPoints}</span></div>
                )}
                {Array.isArray((user as any)?.wallets) && (
                  <div>
                    <div className="subtle mb-1">Connected Wallets:</div>
                    <ul className="text-sm space-y-1">
                      {((user as any).wallets as string[]).length === 0 && (
                        <li className="subtle">No wallets connected yet.</li>
                      )}
                      {((user as any).wallets as string[]).map((w, idx) => (
                        <li key={w+idx} className="font-mono bg-black/5 px-2 py-1 rounded">{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
    </div>
  )
}

function MetricCard({ title, value }: { title: string, value: number }) {
  return (
    <div className="card p-4 transition-shadow hover:shadow-glass">
      <div className="text-sm subtle">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  )
}

function CharityStatus() {
  const user = useAuthStore(s => s.user)

  const fetchPublic = async (charityId: string | number) => {
    try {
      const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'
      const url = `${backend}/api/charities/${charityId}/public`
      const res = await fetch(url)
      if (res.status === 200) {
        const d = await res.json()
        return { status: 'APPROVED', data: d }
      }
      if (res.status === 404) {
        return { status: 'PENDING', id: charityId }
      }
      return { status: 'UNKNOWN', code: res.status }
    } catch (e) {
      return { status: 'UNKNOWN', error: true }
    }
  }

  const { data } = useSWRImmutable(user ? ['charity-status', user.id] : null, async () => {
    // try direct fields on user
    const possibleId = (user as any)?.charityId ?? (user as any)?.appliedCharityId ?? (user as any)?.charity?.id
    if (possibleId) {
      const r = await fetchPublic(possibleId)
      return r
    }

    // fallback discovery
    const discovery = [`/charities?owner=${user?.id}`, `/charities?applicantId=${user?.id}`, '/charities/me', '/charities/my']
    for (const ep of discovery) {
      try {
        const res = await api.get(ep)
        const d = res.data
        if (!d) continue
        const entry = Array.isArray(d) ? d[0] : d
        const id = entry?.id || entry?.charityId || entry?.application?.charityId
        if (id) {
          const r = await fetchPublic(id)
          return r
        }
      } catch (e) {
        // ignore
      }
    }
    return null
  })

  if (!data) return null

  if (data.status === 'APPROVED') {
    return (
      <div className="card p-4">
        <h3 className="text-lg font-semibold">Charity Application Status</h3>
        <div className="mt-2 text-sm">
          <div className="mb-2">Charity: <span className="font-medium">{data.data?.name || data.data?.title || `#${data.data?.id}`}</span></div>
          <div className="mb-1"><span className="font-medium text-emerald-600">Approved</span></div>
          <div className="text-sm subtle">Your charity has been approved — congratulations!</div>
        </div>
      </div>
    )
  }

  if (data.status === 'PENDING') {
    return (
      <div className="card p-4">
        <h3 className="text-lg font-semibold">Charity Application Status</h3>
        <div className="mt-2 text-sm">
          <div className="mb-2">Charity: <span className="font-medium">{data.id ? `#${data.id}` : 'Application'}</span></div>
          <div className="mb-1"><span className="font-medium text-amber-600">Pending</span></div>
          <div className="text-sm subtle">Your application is currently pending review. We'll notify you once it's approved.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold">Charity Application Status</h3>
      <div className="mt-2 text-sm">Status: <span className="font-medium text-rose-600">Unknown</span></div>
    </div>
  )
}
