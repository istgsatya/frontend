import Link from 'next/link'

type Charity = {
  id: string | number
  name?: string
  title?: string
  description?: string
  summary?: string
  logoUrl?: string
  logo?: string
}

async function getApprovedCharities(): Promise<Charity[]> {
  const res = await fetch('http://localhost:8080/api/charities/approved', {
    // Always fetch fresh during dev; adjust if you want ISR later
    next: { revalidate: 0 },
  })
  if (!res.ok) {
    console.error('Failed to load approved charities', await res.text())
    throw new Error('Failed to load charities')
  }
  const data = await res.json()
  // Some backends wrap in {content: []} or {data: []}; normalize
  if (Array.isArray(data)) return data
  if (Array.isArray((data as any).data)) return (data as any).data
  if (Array.isArray((data as any).content)) return (data as any).content
  return []
}

export default async function CharitiesBrowsePage() {
  const charities = await getApprovedCharities()
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Browse Charities</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {charities.map((c) => {
          const name = c.name || c.title || `Charity #${c.id}`
          const desc = c.description || c.summary || ''
          const logo = c.logoUrl || (c as any).imageUrl || c.logo
          return (
            <div key={String(c.id)} className="glass rounded-2xl p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt={name} className="w-10 h-10 rounded object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded bg-brand-100 text-brand-700 grid place-items-center font-semibold">
                    {name.slice(0, 1)}
                  </div>
                )}
                <Link href={`/charity/${c.id}`} className="font-medium text-slate-800 hover:text-brand-700 underline-offset-2 hover:underline">
                  {name}
                </Link>
              </div>
              {desc && <p className="text-sm text-slate-600 line-clamp-3">{desc}</p>}
              <div className="mt-4">
                <Link href={`/charity/${c.id}`} className="inline-flex items-center px-3 py-1.5 rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors">
                  View Charity
                </Link>
              </div>
            </div>
          )
        })}
        {charities.length === 0 && (
          <div className="col-span-full text-center text-slate-500">No approved charities yet.</div>
        )}
      </div>
    </div>
  )
}
