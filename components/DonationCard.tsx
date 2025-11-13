"use client"
import React from 'react'
import { motion } from 'framer-motion'
import { formatINR, formatEth } from '@/lib/format'

function randomColorForSeed(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i)
  const hue = Math.abs(h) % 360
  return `hsl(${hue} 65% 60%)`
}

export default function DonationCard({ donation, ethToInrRate }: { donation: any; ethToInrRate?: number }) {
  const name = donation?.username ?? donation?.donorName ?? (donation?.from ? `${String(donation.from).slice(0,6)}...${String(donation.from).slice(-4)}` : 'Anonymous')
  const ethAmt = Number(donation?.amount ?? donation?.amountEth ?? donation?.value ?? 0)
  const inrAmt = Number(donation?.amountFiat ?? donation?.amountInr ?? donation?.fiatAmount ?? 0) || (ethAmt && ethToInrRate ? ethAmt * ethToInrRate : 0)

  const avatarColor = randomColorForSeed(String(name))

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      whileHover={{ y: -4, boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}
      className="p-4 bg-gradient-to-br from-white/60 to-slate-50 rounded-lg border border-slate-200 flex items-center gap-4"
    >
      <div style={{ background: avatarColor }} className="w-12 h-12 rounded-md flex items-center justify-center text-white font-semibold">{String(name).charAt(0).toUpperCase()}</div>
      <div className="flex-1">
        <div className="flex items-baseline gap-3">
          <div className="text-xl font-semibold">{formatINR(Number(inrAmt) || 0, 0)}</div>
          <div className="text-sm subtle">≈ {typeof ethAmt === 'number' ? formatEth(ethAmt, 6) : '—'} ETH</div>
        </div>
        <div className="mt-1 text-sm text-slate-600">{name} • donated {donation?.createdAt ? new Date(String(donation.createdAt)).toLocaleString() : '—'}</div>
      </div>
      <div className="flex-shrink-0">
        {donation?.transactionHash ? (
          <a target="_blank" rel="noreferrer" href={`https://sepolia.etherscan.io/tx/${donation.transactionHash}`} className="inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-slate-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 3h6v6"/></svg>
            <span className="text-xs">View</span>
          </a>
        ) : (
          <span className="text-xs subtle">—</span>
        )}
      </div>
    </motion.div>
  )
}
