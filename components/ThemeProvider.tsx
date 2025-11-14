"use client"
import { ReactNode, useEffect } from 'react'

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      const root = document.documentElement
      const stored = window.localStorage.getItem('tc-theme')
      const preferred = stored || 'dark'
      if (preferred === 'dark') root.classList.add('dark')
      else root.classList.remove('dark')
    } catch {}
  }, [])
  return <>{children}</>
}
export default ThemeProvider
