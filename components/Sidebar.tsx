"use client"
import Link from 'next/link'
import { BecomeCharityButton } from './modals/BecomeCharityButton'
import { useAuthStore } from '@/lib/store/auth'

export function Sidebar() {
  const user = useAuthStore(s => s.user)
  const roles: string[] = user?.roles || []
  const isCharityAdmin = roles.includes('ROLE_CHARITY_ADMIN')
  const isPlatformAdmin = roles.includes('ROLE_PLATFORM_ADMIN')
  // Accept multiple possible donor role shapes (backend may vary)
  const donorRoleAliases = ['ROLE_DONOR', 'DONOR', 'ROLE_USER', 'USER', 'donor', 'user']
  const isDonor = roles.some(r => donorRoleAliases.includes(String(r)))
  // Developer override: set localStorage.tc-admin-override = '1' to reveal admin link when roles are missing
  const isDevAdminOverride = typeof window !== 'undefined' && window.localStorage?.getItem?.('tc-admin-override') === '1'
  return (
    <aside className="w-64 hidden md:block">
      <div className="sticky top-16 h-[calc(100vh-4rem)] p-4 pr-2">
        <div className="glass rounded-2xl p-3 h-full overflow-auto">
          <nav className="space-y-1">
            <Link href="/" className="block px-3 py-2 rounded-lg hover:bg-brand-50 text-slate-700 hover:text-brand-700 transition-colors">Home</Link>
            <Link href="/my-account" className="block px-3 py-2 rounded-lg hover:bg-brand-50 text-slate-700 hover:text-brand-700 transition-colors">My Account</Link>
            <Link href="/dashboard/donor" className="block px-3 py-2 rounded-lg hover:bg-brand-50 text-slate-700 hover:text-brand-700 transition-colors">My Dashboard</Link>
            <Link href="/browse/charities" className="block px-3 py-2 rounded-lg hover:bg-brand-50 text-slate-700 hover:text-brand-700 transition-colors">Browse Charities</Link>
            <Link href="/browse/campaigns" className="block px-3 py-2 rounded-lg hover:bg-brand-50 text-slate-700 hover:text-brand-700 transition-colors">Browse Campaigns</Link>
            {isCharityAdmin && (
              <>
                <Link href="/dashboard/charity" className="block px-3 py-2 rounded-lg hover:bg-brand-50 text-slate-700 hover:text-brand-700 transition-colors">My Charity Dashboard</Link>
                {/* Create Campaign moved into the charity dashboard main area so it can show fundraising context and totals — remove from sidebar */}
              </>
            )}
            {(isPlatformAdmin || isDevAdminOverride) && (
              <Link href="/dashboard/admin" className="block px-3 py-2 rounded-lg hover:bg-brand-50 text-slate-700 hover:text-brand-700 transition-colors">Admin Control Panel</Link>
            )}
          </nav>
          <div className="pt-4">
            {/* Only donors should see the Register Your Charity action; admins and charity owners should not */}
            {isDonor && <BecomeCharityButton />}
          </div>
        </div>
      </div>
    </aside>
  )
}
