export type VsCurrency = 'inr' | 'usd' | 'eur' | 'gbp'

export async function fetchEthPrice(vs: VsCurrency = 'inr'): Promise<number> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=${vs}`
  try {
    // Dev-time verbose diagnostics to help trace pricing failures in the wild
    // eslint-disable-next-line no-console
    console.debug('[fetchEthPrice] requesting url:', url)
    const res = await fetch(url)
    // eslint-disable-next-line no-console
    console.debug('[fetchEthPrice] response status:', res.status)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      // eslint-disable-next-line no-console
      console.error('[fetchEthPrice] non-OK response:', res.status, text)
      throw new Error('Failed to fetch price')
    }
    const data = await res.json()
    // eslint-disable-next-line no-console
    console.debug('[fetchEthPrice] response json:', data)
    const raw = data?.ethereum?.[vs]
    const price = typeof raw === 'number' ? raw : Number(raw)
    if (!isFinite(price) || price <= 0) {
      // eslint-disable-next-line no-console
      console.error('[fetchEthPrice] invalid price value:', price)
      throw new Error('Invalid price returned from price feed')
    }
    return price
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('[fetchEthPrice] error fetching price:', e?.message || e)
    throw e
  }
}

export function fiatToEth(amountFiat: number, price: number): number {
  // Return NaN for invalid inputs so callers can detect and disable actions.
  if (!isFinite(amountFiat) || amountFiat <= 0) return Number.NaN
  if (!isFinite(price) || price <= 0) return Number.NaN
  const eth = amountFiat / price
  return Number.isFinite(eth) ? eth : Number.NaN
}
