import { BrowserProvider, Contract, JsonRpcSigner } from 'ethers'
import abi from '@/public/PlatformLedger.json'

export function getProvider(): BrowserProvider | null {
  if (typeof window === 'undefined') return null
  const { ethereum } = window as any
  if (!ethereum) return null
  return new BrowserProvider(ethereum)
}

export async function getSigner(): Promise<JsonRpcSigner | null> {
  const provider = getProvider()
  if (!provider) return null
  await provider.send('eth_requestAccounts', [])
  return await provider.getSigner()
}

export async function getContract() {
  const signer = await getSigner()
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
  if (!signer || !address) throw new Error('Contract not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS and ABI.')
  return new Contract(address, abi as any, signer)
}
