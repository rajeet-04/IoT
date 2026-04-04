'use client';

import { useState, useEffect } from 'react';
import { getAccounts } from '@/lib/wallet';
import { ExternalLink } from 'lucide-react';

export function WalletStatus() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    try {
      const accounts = await getAccounts();
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setConnected(true);
      }
    } catch (error) {
      console.error('Failed to check wallet:', error);
    }
  }

  if (!connected || !address) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-gray-400" />
        <span>Not Connected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="h-2 w-2 rounded-full bg-green-500" />
      <span className="text-green-600 font-medium">Connected</span>
      <span className="text-muted-foreground">• Sepolia</span>
      <a
        href={`https://sepolia.etherscan.io/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground"
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
