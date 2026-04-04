'use client';

import { useState, useEffect } from 'react';
import { connectWallet, disconnectWallet, getAccounts, isConnected } from '@/lib/wallet';
import { ExternalLink, Wallet } from 'lucide-react';

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletConnect() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check connection status on mount
  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    try {
      const connected = await isConnected();
      if (connected) {
        const accounts = await getAccounts();
        setAddress(accounts[0]);
        setConnected(true);
      }
    } catch (error) {
      console.error('Failed to check wallet connection:', error);
    }
  }

  async function handleConnect() {
    setLoading(true);
    try {
      const { accounts, chainId } = await connectWallet();
      setAddress(accounts[0]);
      setConnected(true);
      
      // Check if on wrong network
      if (chainId !== '0xaa36a7') {
        alert('Please switch to Sepolia testnet in MetaMask.');
      } else {
        alert(`Connected: ${truncateAddress(accounts[0])}`);
      }
    } catch (error: any) {
      if (error.code === 4001) {
        alert('Connection rejected. Please approve the connection request in MetaMask.');
      } else if (error.code === -32002) {
        alert('A connection request is already pending in MetaMask.');
      } else {
        alert(error.message || 'Failed to connect wallet.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    await disconnectWallet();
    setAddress(null);
    setConnected(false);
    alert('Wallet disconnected.');
  }

  if (connected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {truncateAddress(address)}
        </span>
        <button
          onClick={handleDisconnect}
          className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
    >
      <Wallet className="w-4 h-4" />
      {loading ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
