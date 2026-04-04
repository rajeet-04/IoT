'use client';

import { useState, useEffect } from 'react';
import { connectWallet, disconnectWallet, getAccounts, isConnected, switchToSepolia } from '@/lib/wallet';
import { apiPost } from '@/lib/api';
import { Wallet, CheckCircle, AlertCircle } from 'lucide-react';

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletConnect() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check connection status on mount
  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    try {
      const alreadyConnected = await isConnected();
      if (alreadyConnected) {
        const accounts = await getAccounts();
        if (accounts[0]) {
          setAddress(accounts[0]);
          setConnected(true);
        }
      }
    } catch (err) {
      // Not an error if MetaMask isn't installed — just not connected
      console.log('Wallet not available:', err);
    }
  }

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const { accounts, chainId } = await connectWallet();

      // Switch to Sepolia if on wrong network
      if (chainId !== '0xaa36a7') {
        try {
          await switchToSepolia();
        } catch (switchErr: any) {
          setError('Please switch to Sepolia testnet in MetaMask.');
          return;
        }
      }

      setAddress(accounts[0]);
      setConnected(true);

      // Save wallet address to backend
      try {
        await apiPost('/api/auth/wallet', { walletAddress: accounts[0] });
        console.log('[Wallet] Address saved to backend');
      } catch (apiError) {
        console.error('[Wallet] Failed to save address to backend:', apiError);
      }
    } catch (err: any) {
      if (err.code === 4001) {
        setError('Connection rejected. Please approve in MetaMask.');
      } else if (err.code === -32002) {
        setError('MetaMask already has a pending request. Check the extension.');
      } else if (err.message?.includes('not installed')) {
        setError('MetaMask not found. Please install the MetaMask extension.');
      } else {
        setError(err.message || 'Failed to connect wallet.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    await disconnectWallet();
    setAddress(null);
    setConnected(false);
    setError(null);
  }

  if (connected && address) {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <span className="text-sm font-mono text-green-700 bg-green-50 px-2 py-1 rounded">
          {truncateAddress(address)}
        </span>
        <button
          onClick={handleDisconnect}
          className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleConnect}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50 font-medium text-sm"
      >
        <Wallet className="w-4 h-4" />
        {loading ? 'Connecting...' : 'Connect MetaMask'}
      </button>
      {error && (
        <div className="flex items-center gap-1 text-xs text-red-600 max-w-[240px] text-right">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
