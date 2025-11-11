"use client"
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { fetchEthPrice } from '@/lib/price'

interface EthPriceContextValue {
  price: number | null
  loading: boolean
  error: string | null
  lastUpdated: number | null
  refresh: () => Promise<void>
}

const EthPriceContext = createContext<EthPriceContextValue | undefined>(undefined)

export function EthPriceProvider({ children }: { children: React.ReactNode }) {
  const [price, setPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const retryRef = useRef<number>(0)

  const load = async () => {
    setLoading(true)
    try {
      const p = await fetchEthPrice('inr')
      setPrice(p)
      setError(null)
      setLastUpdated(Date.now())
    } catch (e: any) {
      setError(e?.message || 'Failed to load ETH price')
      // Provide a conservative fallback once after repeated failures (approximate)
      if (retryRef.current >= 2 && price === null) {
        // NOTE: This fallback value should be replaced with backend-provided price for production reliability.
        setPrice(250000) // Approximate INR per ETH placeholder
      }
      retryRef.current += 1
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 60_000) // refresh every minute
    return () => clearInterval(iv)
  }, [])

  const value: EthPriceContextValue = {
    price,
    loading,
    error,
    lastUpdated,
    refresh: load
  }
  return <EthPriceContext.Provider value={value}>{children}</EthPriceContext.Provider>
}

export function useEthPrice() {
  const ctx = useContext(EthPriceContext)
  if (!ctx) throw new Error('useEthPrice must be used within EthPriceProvider')
  return ctx
}
