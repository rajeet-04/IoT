'use client';

import { useState, useEffect } from 'react';
import { WalletConnect } from '@/components/wallet/wallet-connect';
import { isConnected } from '@/lib/wallet';
import { TransactionTable } from '@/components/transactions/transaction-table';
import { TransactionSummary } from '@/components/transactions/transaction-summary';
import { BlockchainStatus } from '@/components/transactions/blockchain-status';
import { apiGet } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { History, WalletCards, ChevronDown } from 'lucide-react';

interface Device {
  deviceId: string;
  name: string;
}

export default function TransactionsPage() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkWallet();
    fetchDevices();
  }, []);
  
  async function checkWallet() {
    try {
      const connected = await isConnected();
      setWalletConnected(connected);
    } catch (error) {
      console.error('Wallet check failed:', error);
    }
  }
  
  async function fetchDevices() {
    try {
      const res = await apiGet('/api/devices');
      const data = await res.json();
      setDevices(data.devices || []);
      if (data.devices?.length > 0) {
        setSelectedDevice(data.devices[0].deviceId);
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-slate-50/90 px-5 py-5 backdrop-blur sm:px-8">
        <div className="flex items-center justify-between gap-4 pl-12 lg:pl-0">
          <div>
            <p className="eyebrow">Audit trail</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Transaction history</h1>
            <p className="mt-1 text-sm text-slate-500">Every verified relay action, in one searchable timeline.</p>
          </div>
          <WalletConnect />
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      
      {!walletConnected && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><WalletCards className="h-5 w-5" /></div>
              <div>
                <p className="font-semibold text-slate-900">Connect your wallet to view transactions</p>
                <p className="mt-1 text-sm text-slate-600">
                  Each relay action creates a blockchain transaction signed by your wallet.
                </p>
              </div>
          </CardContent>
        </Card>
      )}
      
      {walletConnected && devices.length > 0 && (
        <>
          {/* Device Selector */}
          <div className="app-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><History className="h-5 w-5" /></div>
            <div className="flex-1"><p className="text-sm font-semibold text-slate-800">Choose a device</p><p className="text-xs text-slate-500">The audit trail is scoped to one relay.</p></div>
            <div className="relative">
            <select
              value={selectedDevice || ''}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            >
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.name || device.deviceId}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>
          
          {/* Blockchain Status */}
          <BlockchainStatus />
          
          {/* Summary Cards */}
          {selectedDevice && (
            <TransactionSummary deviceId={selectedDevice} />
          )}
          
          {/* Transaction Table */}
          {selectedDevice && (
            <div className="app-surface overflow-hidden p-5 sm:p-6">
              <h2 className="mb-1 text-lg font-bold tracking-tight text-slate-900">Recent transactions</h2>
              <p className="mb-5 text-sm text-slate-500">A permanent ledger for this device’s state changes.</p>
              <TransactionTable deviceId={selectedDevice} />
            </div>
          )}
        </>
      )}
      
      {walletConnected && devices.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">
              No devices registered. Register a device to start recording transactions.
            </p>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
