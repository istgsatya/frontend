import useSWR from 'swr'
import { getReadOnlyContract } from '@/lib/web3'
import { useAuthStore } from '@/lib/store/auth'

export default function useOnChainWithdrawalData(onChainRequestId: any, campaignId: any) {
  const key = onChainRequestId ? `onchain-withdrawal-${String(onChainRequestId)}` : null

  const fetcher = async () => {
    console.debug('[useOnChainWithdrawalData] Fetching ALL on-chain data for request:', onChainRequestId)
    let contract
    try {
      contract = await getReadOnlyContract()
    } catch (e: any) {
      // If no JSON RPC is configured, surface the error and stop trying to poll the wallet provider.
      console.warn('[useOnChainWithdrawalData] Aborting on-chain fetch -', e?.message ?? e)
      throw e
    }

    const requestIdBig = BigInt(onChainRequestId ?? 0)
    const requestData = await contract.withdrawalRequests(requestIdBig)

    const userAddress = (useAuthStore as any).getState ? (useAuthStore as any).getState().user?.wallets?.[0]?.address : null

    if (!userAddress) {
      return { requestData, hasVoted: false, contribution: 0n }
    }

    // sequential: first hasVoted, then contribution
    const hasVoted = await contract.hasVoted(requestIdBig, userAddress)
    let contribution = 0n
    try {
      contribution = await contract.campaignContributions(campaignId ?? 0, userAddress)
    } catch (e) {
      // ignore if not present
    }

    return { requestData, hasVoted, contribution }
  }

  // Increase refresh interval to reduce pressure on RPC; also do not revalidate on focus.
  // Use an onErrorRetry to avoid aggressive retries when RPC is misconfigured.
  const { data, error, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 15000,
    onErrorRetry(err, key, config, revalidate, { retryCount }) {
      // If RPC not configured, do not retry continuously — stop retrying.
      if (String(err?.message ?? '').toLowerCase().includes('next_public_rpc_url') || String(err?.message ?? '').toLowerCase().includes('no json rpc')) {
        return // give up — developer must configure NEXT_PUBLIC_RPC_URL
      }
      // Backoff retries: allow up to 3 quick retries then back off
      if (retryCount >= 3) return
      // Retry after 5s
      setTimeout(() => revalidate({ retryCount: (retryCount || 0) + 1 }), 5000)
    }
  })
  return { data, error, isLoading: !data && !error, mutate }
}
