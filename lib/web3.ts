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
  // Avoid prompting users repeatedly: check for already-connected accounts first
  try {
    // Use eth_accounts RPC to list connected accounts without prompting
    let accounts: string[] = []
    try {
      // provider.send returns the raw RPC result which is an array of addresses
      // @ts-ignore
      accounts = await provider.send('eth_accounts', [])
    } catch {
      // fallback to listAccounts if send is not available
      try {
        // @ts-ignore
        accounts = await provider.listAccounts()
      } catch {
        accounts = []
      }
    }
    if (!accounts || accounts.length === 0) {
      // Try the modern permissions request first, fall back to eth_requestAccounts
      try {
        // Some wallets support wallet_requestPermissions; use it when available
        // @ts-ignore - provider.send may accept this payload for many wallets
        await provider.send('wallet_requestPermissions', [{ eth_accounts: {} }])
      } catch {
        await provider.send('eth_requestAccounts', [])
      }
    }
  } catch (err) {
    // If anything goes wrong, still attempt to request accounts as a fallback
    try {
      await provider.send('eth_requestAccounts', [])
    } catch {
      // swallow; getSigner caller will handle absence of signer
    }
  }
  return await provider.getSigner()
}

export async function getContract() {
  const signer = await getSigner()
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
  if (!signer || !address) throw new Error('Contract not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS and ABI.')
  return new Contract(address, abi as any, signer)
}

/**
 * Ensure the user's wallet is connected to Sepolia testnet (chainId 11155111).
 * Attempts to switch the chain programmatically via the provider. If the chain
 * is unknown to the wallet, attempts to add it with a public RPC and explorer.
 */
export async function ensureSepolia(provider?: BrowserProvider | null) {
  const prov = provider ?? getProvider()
  if (!prov) throw new Error('No Web3 provider found')
  try {
    const network = await prov.getNetwork()
    if (Number(network.chainId) === 11155111) return
  } catch {
    // ignore and attempt switch
  }

  try {
    // Try switching chain; wallets expect chainId as hex string
    // @ts-ignore
    await prov.send('wallet_switchEthereumChain', [{ chainId: '0xaa36a7' }])
    return
  } catch (err: any) {
    // If the chain has not been added to the wallet, attempt to add it
    const msg = String(err?.message ?? '')
    const code = err?.code ?? err?.data?.originalError?.code
    if (code === 4902 || msg.includes('4902') || msg.toLowerCase().includes('unrecognized chain')) {
      try {
        // @ts-ignore
        await prov.send('wallet_addEthereumChain', [{
          chainId: '0xaa36a7',
          chainName: 'Sepolia Testnet',
          nativeCurrency: { name: 'SepoliaETH', symbol: 'SepoliaETH', decimals: 18 },
          rpcUrls: ['https://rpc.sepolia.org'],
          blockExplorerUrls: ['https://sepolia.etherscan.io']
        }])
        return
      } catch {
        throw new Error('Failed to add Sepolia network to wallet')
      }
    }
    // Re-throw a friendly message for other errors so callers can show it
    throw new Error('Please switch your wallet network to Sepolia testnet')
  }
}
