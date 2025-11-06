import Link from 'next/link'

type Charity = { id: string | number; name?: string; title?: string }
type Campaign = {
  id: string | number
  title?: string
  name?: string
  description?: string
  summary?: string
  goalAmount?: number
  targetAmount?: number
  goal?: number
  raisedAmount?: number
  raised?: number
  charity?: Charity
  charityId?: string | number
  charity_id?: string | number
}

async function getCampaigns(): Promise<Campaign[]> {
  const res = await fetch('http://localhost:8080/api/campaigns', { next: { revalidate: 0 } })
  if (!res.ok) {
    console.error('Failed to load campaigns', await res.text())
    throw new Error('Failed to load campaigns')
  }
  const data = await res.json()
  if (Array.isArray(data)) return data
  if (Array.isArray((data as any).data)) return (data as any).data
  if (Array.isArray((data as any).content)) return (data as any).content
  return []
}

async function getApprovedCharities(): Promise<Charity[]> {
  const res = await fetch('http://localhost:8080/api/charities/approved', { next: { revalidate: 0 } })
  if (!res.ok) return []
  const data = await res.json()
  if (Array.isArray(data)) return data
  if (Array.isArray((data as any).data)) return (data as any).data
  if (Array.isArray((data as any).content)) return (data as any).content
  return []
}

function resolveCharityRef(c: Campaign, charitiesById: Map<string, Charity>) {
  if (c.charity && c.charity.id != null) return c.charity
  const cid = (c.charityId ?? (c as any).charityID ?? c.charity_id) as string | number | undefined
  if (cid != null) {
    const key = String(cid)
    const found = charitiesById.get(key)
    if (found) return found
    return { id: cid } as Charity
  }
  return undefined
}

export default async function CampaignsBrowsePage() {
  const [campaigns, charities] = await Promise.all([getCampaigns(), getApprovedCharities()])
  const charitiesById = new Map<string, Charity>(charities.map((ch) => [String(ch.id), ch]))

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Browse Campaigns</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((c) => {
          const title = c.title || c.name || `Campaign #${c.id}`
          const desc = c.description || c.summary || ''
          const charity = resolveCharityRef(c, charitiesById)
          const charityName = charity?.name || charity?.title || (charity?.id != null ? `Charity #${charity.id}` : 'Unknown Charity')
          const charityHref = charity?.id != null ? `/charity/${charity.id}` : undefined
          const goal = c.goalAmount ?? c.targetAmount ?? c.goal
          const raised = c.raisedAmount ?? c.raised
          const pct = goal && raised ? Math.min(100, Math.round((raised / goal) * 100)) : undefined
          return (
            <div key={String(c.id)} className="glass rounded-2xl p-4 hover:shadow-lg transition-shadow">
              <h3 className="font-medium text-slate-800 mb-1 line-clamp-1">{title}</h3>
              {charityHref ? (
                <Link href={charityHref} className="text-sm text-brand-700 hover:underline">
                  By {charityName}
                </Link>
              ) : (
                <div className="text-sm text-slate-500">By {charityName}</div>
              )}
              {desc && <p className="text-sm text-slate-600 mt-3 line-clamp-3">{desc}</p>}

              {pct != null && (
                <div className="mt-4">
                  <div className="h-2 w-full rounded bg-slate-200 overflow-hidden">
                    <div className="h-full bg-brand-600" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{raised?.toLocaleString?.()} / {goal?.toLocaleString?.()}</div>
                </div>
              )}

              <div className="mt-4">
                <Link href={`/campaign/${c.id}`} className="inline-flex items-center px-3 py-1.5 rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors">
                  View Campaign
                </Link>
              </div>
            </div>
          )
        })}
        {campaigns.length === 0 && (
          <div className="col-span-full text-center text-slate-500">No campaigns found.</div>
        )}
      </div>
    </div>
  )
}
