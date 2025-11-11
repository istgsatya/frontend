"use client"
import useSWR from 'swr'
import { getContract } from '@/lib/web3'

export type OnChainVoteData = { votesFor: bigint; votesAgainst: bigint; votingDeadline?: bigint }

async function fetchOnChainVotes(key: string, requestId: bigint): Promise<OnChainVoteData> {
  const contract = await getContract()
  const req = await contract.withdrawalRequests(requestId)
  // Normalize BigInt-like values
  const votesFor: bigint = typeof req.votesFor === 'bigint' ? req.votesFor : BigInt(req.votesFor?.toString?.() ?? '0')
  const votesAgainst: bigint = typeof req.votesAgainst === 'bigint' ? req.votesAgainst : BigInt(req.votesAgainst?.toString?.() ?? '0')
  const votingDeadline: bigint | undefined = req.votingDeadline ? (typeof req.votingDeadline === 'bigint' ? req.votingDeadline : BigInt(req.votingDeadline?.toString?.() ?? '0')) : undefined
  return { votesFor, votesAgainst, votingDeadline }
}

export default function useOnChainVoteData(onChainRequestId?: number | string | bigint) {
  const key = onChainRequestId === undefined || onChainRequestId === null ? null : ['onchain-votes', String(onChainRequestId)] as const
  const { data, error, isLoading, mutate } = useSWR(key, async (_key) => {
    const idBig = typeof onChainRequestId === 'bigint' ? onChainRequestId : BigInt(onChainRequestId as any)
    return fetchOnChainVotes('onchain', idBig)
  }, { refreshInterval: 5000 })
  return { data, error, isLoading, mutate }
}
