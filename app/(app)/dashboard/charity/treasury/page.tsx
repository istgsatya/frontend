"use client"
import React, { useEffect, useState } from 'react'
import useSWR from 'swr'
import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth'
import { useRouter } from 'next/navigation'
import { formatEth } from '@/lib/format'
import RequestWithdrawalModal from '@/components/RequestWithdrawalModal'

// fetcher removed - not used in this file

export default function TreasuryPage() {
  const user = useAuthStore(s => s.user)
  const router = useRouter()

  // data state
  type Campaign = { id: number; title?: string; goalAmount?: number; status?: string }
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [balances, setBalances] = useState<Record<number, string>>({})
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [modalOpenFor, setModalOpenFor] = useState<{ id: number; balance: number } | null>(null)
  const [withdrawalsMap, setWithdrawalsMap] = useState<Record<number, any[]>>({})

  // Minimal admin guard: if user isn't present, return null
  useEffect(() => {
    if (!user) return
    const isAdmin = (user as any)?.roles?.includes('ROLE_CHARITY_ADMIN')
    if (!isAdmin) {
      router.replace('/')
      return
    }
  }, [user, router])

  // Main data fetching effect (runs once on mount)
  useEffect(() => {
    // This is the main data fetching function for this page.
    const fetchTreasuryData = async () => {
        setIsLoading(true);
        console.log("TREASURY: Initiating data fetch...");

        try {
            // STEP A: Fetch the charity's list of campaigns.
            // Note: apiClient already has baseURL '/api' in our project, so we call the route without duplicating '/api'.
            // NEW ROUTE: backend moved the 'me' endpoints under /my-charity
            const campaignsResponse = await apiClient.get('/my-charity/campaigns');
            const campaignsData: Campaign[] = campaignsResponse.data;
            setCampaigns(campaignsData);
            console.log(`TREASURY: Fetched ${campaignsData.length} campaigns.`);

            // STEP B: If and ONLY IF campaigns are found, fetch the balance for EACH ONE.
            if (campaignsData && campaignsData.length > 0) {
                console.log("TREASURY: Fetching balances for all campaigns...");
                const balancePromises = campaignsData.map(campaign =>
                    apiClient.get(`/campaigns/${campaign.id}/balance`)
                );
                
                // We use Promise.all to fetch all balances in parallel for performance.
                const balanceResults = await Promise.all(balancePromises);
                
                // Now, we build the balance map.
                const balancesMap: Record<number, string> = {};
                campaignsData.forEach((campaign, index) => {
                    balancesMap[campaign.id] = balanceResults[index].data.balance;
                });
                
                setBalances(balancesMap);
                console.log("TREASURY: Balances map created.", balancesMap);
            }

        } catch (error) {
            console.error("!!!!!!!!!! TREASURY: FAILED TO FETCH DATA !!!!!!!!!!", error);
            // Implement a real error UI here, don't just log.
        } finally {
            setIsLoading(false);
            console.log("TREASURY: Data fetch complete.");
        }
    };

    fetchTreasuryData();
  }, []); // This effect runs ONCE on component mount.

  if (!user) return null

  if (isLoading) {
    return <div>Loading Treasury Data...</div>
  }

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-semibold mb-4">Treasury — Manage Funds</h1>
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm subtle">Your campaigns</div>
            <div className="text-lg font-semibold mt-1">{campaigns.length} campaigns</div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs subtle">
                <th className="p-2">Campaign</th>
                <th className="p-2">Status</th>
                <th className="p-2">Goal (ETH)</th>
                <th className="p-2">Funds Raised (ETH)</th>
                <th className="p-2">Progress</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-t border-black/5">
                  <td className="p-2 max-w-xs">
                    <div className="font-medium truncate max-w-[20rem]">{campaign.title}</div>
                  </td>
                  <td className="p-2">{(campaign.status || 'ACTIVE').toUpperCase()}</td>
                  <td className="p-2">{campaign.goalAmount ?? '—'} ETH</td>
                  <td className="p-2">{balances[campaign.id] ? `${balances[campaign.id]} ETH` : 'Loading...'}</td>
                  <td className="p-2 w-64">
                    {/* Basic progress bar using numeric balance and goal */}
                    {(() => {
                      const bal = Number(balances[campaign.id] ?? 0)
                      const goal = Number(campaign.goalAmount ?? 0)
                      const pct = !goal || goal <= 0 ? 0 : Math.min(100, Math.round((bal / goal) * 100))
                      return (
                        <div className="w-full bg-black/5 rounded-full h-2 overflow-hidden">
                          <div className="h-2 bg-gradient-to-r from-brand-500 to-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                      )
                    })()}
                  </td>
                  <td className="p-2">
                    {(() => {
                      const bal = Number(balances[campaign.id] ?? 0)
                      const goal = Number(campaign.goalAmount ?? 0)
                      const hasMoney = bal > 0
                      const reachedGoal = bal >= goal
                      const canWithdraw = hasMoney && reachedGoal
                      return (
                        <button
                          onClick={() => { if (canWithdraw) setModalOpenFor({ id: campaign.id, balance: bal }) }}
                          disabled={!canWithdraw}
                          className={`btn-primary text-sm ${!canWithdraw ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={!canWithdraw ? (hasMoney ? 'Campaign must reach its goal before withdrawals' : 'No funds available') : 'Request withdrawal'}
                        >Withdraw Funds</button>
                      )
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modalOpenFor && (
        <RequestWithdrawalModal
          open={true}
          onClose={() => setModalOpenFor(null)}
          campaignId={modalOpenFor.id}
          availableBalance={modalOpenFor.balance}
          onSuccess={async () => {
            try {
              // Immediately fetch latest withdrawals for the campaign so UI can show it
              const res = await apiClient.get(`/campaigns/${modalOpenFor.id}/withdrawals`)
              setWithdrawalsMap(prev => ({ ...(prev || {}), [modalOpenFor.id]: res.data }))
            } catch (e) {
              // ignore - network issues will be surfaced elsewhere
            }
            try { router.refresh() } catch {}
          }}
        />
      )}
    </div>
  )
}
