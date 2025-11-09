"use client"
import React, { useMemo, useState } from 'react'
import { formatEth, formatDateHuman } from '@/lib/format'

type Donation = {
  id?: string | number
  campaignTitle?: string
  username?: string
  amount?: number
  createdAt?: string
  transactionHash?: string
}

export default function DonationsTable({ donations, loading }: { donations: Donation[]; loading: boolean }) {
  const [sortKey, setSortKey] = useState<'createdAt' | 'amount' | 'campaignTitle' | 'username'>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const sorted = useMemo(() => {
    if (!donations) return []
    const copy = [...donations]
    copy.sort((a: any, b: any) => {
      const aVal = a?.[sortKey]
      const bVal = b?.[sortKey]
      if (sortKey === 'amount') {
        return (Number(aVal) || 0) - (Number(bVal) || 0)
      }
      if (sortKey === 'createdAt') {
        return new Date(aVal || 0).getTime() - new Date(bVal || 0).getTime()
      }
      const as = String(aVal ?? '').toLowerCase()
      const bs = String(bVal ?? '').toLowerCase()
      return as.localeCompare(bs)
    })
    if (sortDir === 'desc') copy.reverse()
    return copy
  }, [donations, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil((sorted?.length || 0) / pageSize))
  const pageItems = sorted.slice((page - 1) * pageSize, page * pageSize)

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  if (loading) {
    return (
      <div className="card p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-black/5 rounded w-1/3" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-black/5 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs subtle">
              <th className="p-2 cursor-pointer" onClick={() => toggleSort('campaignTitle')}>Campaign</th>
              <th className="p-2 cursor-pointer" onClick={() => toggleSort('username')}>Donor</th>
              <th className="p-2 text-right cursor-pointer" onClick={() => toggleSort('amount')}>Amount</th>
              <th className="p-2 cursor-pointer" onClick={() => toggleSort('createdAt')}>Date</th>
              <th className="p-2">Proof</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((d: any) => (
              <tr key={d.id || `${d.transactionHash}-${d.createdAt}`} className="border-t border-black/5">
                <td className="p-2 align-top max-w-xs">
                  <div className="font-medium truncate max-w-[18rem]">{d.campaignTitle ?? '—'}</div>
                </td>
                <td className="p-2 align-top">{d.username ?? d.donorName ?? d.from ?? 'Anonymous'}</td>
                <td className="p-2 align-top text-right font-semibold">{formatEth(Number(d.amount) || 0)}</td>
                <td className="p-2 align-top">{formatDateHuman(d.createdAt)}</td>
                <td className="p-2 align-top">
                  {d.transactionHash ? (
                    <a className="underline text-brand-700" target="_blank" rel="noreferrer" href={`https://sepolia.etherscan.io/tx/${d.transactionHash}`}>View on Etherscan</a>
                  ) : <span className="subtle">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="text-sm subtle">Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}</div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
          <div className="text-sm">{page}/{totalPages}</div>
          <button className="btn-ghost text-sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      </div>
    </div>
  )
}
