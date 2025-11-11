"use client"
import { useEffect, useState } from 'react'

export interface CountdownResult {
  days: number
  hours: number
  minutes: number
  seconds: number
  total: number // total milliseconds remaining
}

function parseTarget(target: Date | number | string | undefined | null): number {
  if (!target) return 0
  if (target instanceof Date) return target.getTime()
  if (typeof target === 'number') {
    // Heuristic: if target < 10^12 assume seconds, convert to ms
    return target < 1_000_000_000_000 ? target * 1000 : target
  }
  // string: try Date parse; if numeric string treat similarly
  const num = Number(target)
  if (!isNaN(num) && target.trim() !== '') {
    return num < 1_000_000_000_000 ? num * 1000 : num
  }
  const d = new Date(target)
  const ms = d.getTime()
  return isNaN(ms) ? 0 : ms
}

export function useCountdown(target: Date | number | string | undefined | null): CountdownResult {
  const [result, setResult] = useState<CountdownResult>(() => ({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }))

  useEffect(() => {
    const targetMs = parseTarget(target)
    if (!targetMs) {
      setResult({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 })
      return
    }
    const compute = () => {
      const now = Date.now()
      const diff = Math.max(0, targetMs - now)
      const s = Math.floor(diff / 1000)
      const days = Math.floor(s / 86400)
      const hours = Math.floor((s % 86400) / 3600)
      const minutes = Math.floor((s % 3600) / 60)
      const seconds = s % 60
      setResult({ days, hours, minutes, seconds, total: diff })
    }
    compute()
    const iv = setInterval(compute, 1000)
    return () => clearInterval(iv)
  }, [target])

  return result
}

export default useCountdown