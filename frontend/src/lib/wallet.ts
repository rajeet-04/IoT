/**
 * Wallet Connection Utilities
 * Uses window.ethereum (MetaMask EIP-1193 provider) directly
 * for reliable connection without SDK spinner issues.
 */

/**
 * Get the injected MetaMask provider
 */
function getEthereumProvider(): any {
  if (typeof window === 'undefined') return null;
  // Support multi-wallet setups (MetaMask)
  const ethereum = (window as any).ethereum;
  if (!ethereum) return null;
  // If multiple wallets, prefer MetaMask
  if (ethereum.providers?.length) {
    return ethereum.providers.find((p: any) => p.isMetaMask) || ethereum.providers[0];
  }
  return ethereum;
}

/**
 * Connect wallet - prompts user to connect MetaMask
 * Returns connected accounts and chainId
 */
export async function connectWallet(): Promise<{ accounts: string[]; chainId: string }> {
  const ethereum = getEthereumProvider();
  if (!ethereum) {
    throw new Error('MetaMask is not installed. Please install MetaMask extension and reload.');
  }

  // Request accounts (triggers MetaMask popup)
  const accounts: string[] = await ethereum.request({ method: 'eth_requestAccounts' });
  const chainId: string = await ethereum.request({ method: 'eth_chainId' });

  return { accounts, chainId };
}

/**
 * Disconnect wallet - clears local state (MetaMask doesn't support programmatic disconnect)
 */
export async function disconnectWallet(): Promise<void> {
  // MetaMask doesn't have a programmatic disconnect via EIP-1193
  // The UI state is cleared by the caller
}

/**
 * Get current connected accounts (no popup)
 */
export async function getAccounts(): Promise<string[]> {
  const ethereum = getEthereumProvider();
  if (!ethereum) return [];
  try {
    const accounts: string[] = await ethereum.request({ method: 'eth_accounts' });
    return accounts || [];
  } catch {
    return [];
  }
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
  const ethereum = getEthereumProvider();
  if (!ethereum) {
    throw new Error('MetaMask not installed.');
  }
  return ethereum;
}

/**
 * Get chain ID of currently connected network
 */
export async function getChainId(): Promise<string | null> {
  try {
    const provider = getProvider();
    const chainId: string = await provider.request({ method: 'eth_chainId' });
    return chainId;
  } catch {
    return null;
  }
}

/**
 * Request to switch to Sepolia testnet
 */
export async function switchToSepolia(): Promise<void> {
  const provider = getProvider();
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xaa36a7' }], // Sepolia
    });
  } catch (switchError: any) {
    // Error 4902 = chain not added to MetaMask
    if (switchError.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0xaa36a7',
          chainName: 'Sepolia Testnet',
          nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://rpc.sepolia.org'],
          blockExplorerUrls: ['https://sepolia.etherscan.io'],
        }],
      });
    } else {
      throw switchError;
    }
  }
}

/**
 * Request to switch to a specific network
 */
export async function switchNetwork(chainId: string): Promise<void> {
  const provider = getProvider();
  await provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId }],
  });
}