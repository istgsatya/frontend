"use client"
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/auth'

export function Navbar() {
  const accessToken = useAuthStore(s => s.accessToken)
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  return (
    <header className="border-b bg-white">
      <div className="container flex items-center justify-between h-14">
        <Link href="/" className="font-semibold text-brand-700">Transparent Cents</Link>
        <nav className="flex items-center gap-4">
          {!accessToken ? (
            <>
              <Link href="/login" className="text-sm text-gray-700 hover:text-brand-700">Login</Link>
              <Link href="/signup" className="text-sm px-3 py-1.5 rounded bg-brand-600 text-white hover:bg-brand-700">Sign Up</Link>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">{user?.username}</span>
              <button onClick={logout} className="text-sm text-gray-700 hover:text-red-600">Logout</button>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
