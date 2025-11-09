"use client"
import useSWR from 'swr'
import { api } from '@/lib/api'
import { formatDateHuman, formatEth } from '@/lib/format'
import CountUp from 'react-countup'

const fetcher = (url: string) => api.get(url).then(r => r.data)

export default function DonorDashboard() {
  const { data: summary } = useSWR('/dashboard/donor', fetcher, { refreshInterval: 7000 })
  const { data: history } = useSWR('/donations/me', fetcher, { refreshInterval: 7000 })

  if (!summary) return <div className="container py-10">Loading...</div>

  return (
    <div className="container py-6 space-y-8">
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card title="Total Donated" value={summary?.totalDonated ?? 0} />
        <Card title="Campaigns Supported" value={summary?.campaignsSupported ?? 0} />
        <Card title="Votes Cast" value={summary?.votesCast ?? 0} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Donation History</h2>
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-black/5">
                <tr>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Campaign</th>
                  <th className="text-left px-4 py-2">Amount</th>
                  <th className="text-left px-4 py-2">Tx</th>
                </tr>
              </thead>
              <tbody>
                {history?.map((d: any) => (
                  <tr key={d.id} className="border-t border-black/5">
                    <td className="px-4 py-2 subtle">{formatDateHuman(d.createdAt)}</td>
                    <td className="px-4 py-2">{d.campaignTitle}</td>
                    <td className="px-4 py-2">{formatEth(d.amount, 6)}</td>
                    <td className="px-4 py-2">{d.transactionHash ? <a target="_blank" rel="noreferrer" href={`https://sepolia.etherscan.io/tx/${d.transactionHash}`} className="text-brand-700 underline">{d.transactionHash}</a> : <span className="subtle">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
