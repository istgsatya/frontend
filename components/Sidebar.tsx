"use client"
import Link from 'next/link'
import { BecomeCharityButton } from './modals/BecomeCharityButton'

export function Sidebar() {
  return (
    <aside className="w-64 border-r hidden md:block">
      <div className="p-4 space-y-2">
        <Link href="/" className="block px-3 py-2 rounded hover:bg-gray-100">Home</Link>
        <Link href="/dashboard/donor" className="block px-3 py-2 rounded hover:bg-gray-100">My Dashboard</Link>
        <Link href="/browse/charities" className="block px-3 py-2 rounded hover:bg-gray-100">Browse Charities</Link>
        <Link href="/browse/campaigns" className="block px-3 py-2 rounded hover:bg-gray-100">Browse Campaigns</Link>
        <div className="pt-2">
          <BecomeCharityButton />
        </div>
      </div>
    </aside>
  )
}
