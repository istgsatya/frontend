export type VsCurrency = 'inr' | 'usd' | 'eur' | 'gbp'

export async function fetchEthPrice(vs: VsCurrency = 'inr'): Promise<number> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=${vs}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch price')
  const data = await res.json()
  return data?.ethereum?.[vs] ?? 0
}

export function fiatToEth(amountFiat: number, price: number): number {
  if (!price) return 0
  return amountFiat / price
}
