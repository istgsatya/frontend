export function formatEth(value: number | string | null | undefined, decimals = 6) {
  if (value === null || value === undefined) return '—'
  const n = Number(value)
  if (!isFinite(n)) return '—'
  // Use toLocaleString so large numbers get grouping, limit fraction digits
  const formatted = n.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: 0 })
  return `${formatted} ETH`
}

export function formatINR(value: number | string | null | undefined, maximumFractionDigits = 0) {
  if (value === null || value === undefined) return '—'
  const n = Number(value)
  if (!isFinite(n)) return '—'
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits }).format(n)
  } catch {
    return `₹${Math.round(n).toLocaleString()}`
  }
}

export function formatDateHuman(iso: string | number | Date | null | undefined) {
  if (!iso) return '—'
  const d = typeof iso === 'string' || typeof iso === 'number' ? new Date(iso) : (iso as Date)
  if (isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec} sec${sec !== 1 ? 's' : ''} ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} min${min !== 1 ? 's' : ''} ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`
  // otherwise show long date
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}
