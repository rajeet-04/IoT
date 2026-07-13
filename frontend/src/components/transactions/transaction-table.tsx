'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Transaction {
  _id: string;
  action: 'on' | 'off';
  timestamp: string;
  duration: number;
  walletAddress: string;
  txHash: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  etherscanUrl?: string;
  etherscanAddress?: string;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${hours}h ${mins}m ${secs}s` : `${hours}h ${mins}m`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  
  if (diffSecs < 60) return 'just now';
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)} minutes ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)} hours ago`;
  if (diffSecs < 604800) return `${Math.floor(diffSecs / 86400)} days ago`;
  return date.toLocaleDateString();
}

function truncateAddress(address: string): string {
  if (!address || address === 'unconnected') return '—';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function truncateHash(hash: string | null): string {
  if (!hash) return '—';
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export function TransactionTable({ deviceId }: { deviceId: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const limit = 20;
  
  useEffect(() => {
    fetchTransactions();
  }, [deviceId, skip]);
  
  async function fetchTransactions() {
    setLoading(true);
    setError(null);
    
    try {
      const res = await apiGet(
        `/api/transactions/${deviceId}/history?limit=${limit}&skip=${skip}`
      );
      const data = await res.json();
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
  } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }
  
  const hasMore = skip + limit < total;
  
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>{error}</p>
        <Button variant="outline" onClick={fetchTransactions} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }
  
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">No transactions yet</p>
        <p className="text-sm">
          Toggle the relay to create your first blockchain transaction.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[760px] w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">#</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Action</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Time</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Duration</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Wallet</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Tx Hash</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {transactions.map((tx, index) => (
              <tr key={tx._id} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-400">
                  {skip + index + 1}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tx.action === 'on' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {tx.action.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span title={new Date(tx.timestamp).toISOString()}>
                    {formatRelativeTime(tx.timestamp)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-mono">
                  {formatDuration(tx.duration)}
                </td>
                <td className="px-4 py-3">
                  {tx.walletAddress !== 'unconnected' && tx.etherscanAddress ? (
                    <a
                      href={tx.etherscanAddress}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      {truncateAddress(tx.walletAddress)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {truncateAddress(tx.walletAddress)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      tx.status === 'confirmed' ? 'default' :
                      tx.status === 'pending' ? 'secondary' : 'destructive'
                    }
                    className={
                      tx.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50' :
                      tx.status === 'pending' ? 'bg-amber-50 text-amber-700 hover:bg-amber-50' : ''
                    }
                  >
                    {tx.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {tx.etherscanUrl ? (
                    <a
                      href={tx.etherscanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm font-mono text-muted-foreground hover:text-foreground"
                    >
                      {truncateHash(tx.txHash)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground font-mono">
                      {truncateHash(tx.txHash)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {skip + 1}-{Math.min(skip + limit, total)} of {total}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSkip(s => s - limit)}
            disabled={skip === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSkip(s => s + limit)}
            disabled={!hasMore}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
