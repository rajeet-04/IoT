'use client';

import { useState, useEffect } from 'react';
import { WalletConnect } from '@/components/wallet/wallet-connect';
import { isConnected } from '@/lib/wallet';
import { TransactionTable } from '@/components/transactions/transaction-table';
import { TransactionSummary } from '@/components/transactions/transaction-summary';
import { BlockchainStatus } from '@/components/transactions/blockchain-status';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transaction History</h1>
          <p className="text-muted-foreground">
            View your blockchain-verified relay action history
          </p>
        </div>
        <WalletConnect />
      </div>
      
      {!walletConnected && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🔗</div>
              <div>
                <p className="font-medium">Connect your wallet to view transactions</p>
                <p className="text-sm text-muted-foreground">
                  Each relay action creates a blockchain transaction signed by your wallet.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {walletConnected && devices.length > 0 && (
        <>
          {/* Device Selector */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Device:</label>
            <select
              value={selectedDevice || ''}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="px-3 py-2 rounded-lg border bg-background"
            >
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.name || device.deviceId}
                </option>
              ))}
            </select>
          </div>
          
          {/* Blockchain Status */}
          <BlockchainStatus />
          
          {/* Summary Cards */}
          {selectedDevice && (
            <TransactionSummary deviceId={selectedDevice} />
          )}
          
          {/* Transaction Table */}
          {selectedDevice && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
              <TransactionTable deviceId={selectedDevice} />
            </div>
          )}
        </>
      )}
      
      {walletConnected && devices.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              No devices registered. Register a device to start recording transactions.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}