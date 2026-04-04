/**
 * Wallet Connection Utilities
 * Uses @metamask/connect-evm for EVM wallet integration
 */

import { createEVMClient, type EVMClient } from '@metamask/connect-evm';

let evmClient: EVMClient | null = null;

/**
 * Singleton client initialization
 * Configured for Sepolia testnet (chainId: 0xaa36a7)
 */
export async function initWalletClient(): Promise<EVMClient> {
  if (evmClient) return evmClient;

  const infuraKey = typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_INFURA_SEPOLIA_KEY || '')
    : '';

  evmClient = await createEVMClient({
    dapp: {
      name: 'IoT Device Control',
      url: typeof window !== 'undefined' 
        ? window.location.origin 
        : 'http://localhost:3000',
    },
    api: {
      supportedNetworks: {
        // Sepolia testnet (chainId: 11155111 decimal)
        '0xaa36a7': `https://sepolia.infura.io/v3/${infuraKey}`,
      },
    },
  });

  return evmClient;
}

/**
 * Connect wallet - prompts user to connect MetaMask
 * Returns connected accounts and chainId
 */
export async function connectWallet(): Promise<{ accounts: string[]; chainId: string }> {
  const client = await initWalletClient();
  return client.connect({ chainIds: ['0xaa36a7'] });
}

/**
 * Disconnect wallet - clears session
 */
export async function disconnectWallet(): Promise<void> {
  if (evmClient) {
    // Session persistence is handled by MetaMask internally
    evmClient = null;
  }
}

/**
 * Get current connected accounts
 */
export async function getAccounts(): Promise<string[]> {
  const client = await initWalletClient();
  const provider = client.getProvider();
  const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
  return accounts || [];
}

/**
 * Check if wallet is connected
 */
export async function isConnected(): Promise<boolean> {
  const accounts = await getAccounts();
  return accounts.length > 0;
}

/**
 * Get EIP-1193 provider for raw RPC calls
 */
export function getProvider() {
  if (!evmClient) {
    throw new Error('Wallet not initialized. Call initWalletClient() first.');
  }
  return evmClient.getProvider();
}

/**
 * Get the EVM client instance
 */
export function getClient(): EVMClient | null {
  return evmClient;
}

/**
 * Get chain ID of currently connected network
 */
export async function getChainId(): Promise<string | null> {
  try {
    const provider = getProvider();
    const chainId = await provider.request({ method: 'eth_chainId' }) as string;
    return chainId;
  } catch {
    return null;
  }
}

/**
 * Request to switch to a specific network
 */
export async function switchNetwork(chainId: string): Promise<void> {
  const provider = getProvider();
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }],
    });
  } catch (switchError: any) {
    // Chain not added - could prompt to add
    throw switchError;
  }
}
