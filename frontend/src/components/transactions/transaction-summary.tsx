'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Clock, Timer, Zap } from 'lucide-react';

interface Summary {
  totalTransactions: number;
  totalOnDuration: number;
  avgOnDuration: number;
  lastAction: string | null;
  lastTimestamp: string | null;
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
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function TransactionSummary({ deviceId }: { deviceId: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchSummary();
  }, [deviceId]);
  
  async function fetchSummary() {
    try {
      const res = await apiGet(`/api/transactions/${deviceId}/summary`);
      const data = await res.json();
      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (!summary) return null;
  
  const cards = [
    {
      title: 'Total Transactions',
      value: summary.totalTransactions.toLocaleString(),
      icon: Activity,
      color: 'text-blue-600'
    },
    {
      title: 'Total ON Time',
      value: formatDuration(summary.totalOnDuration),
      icon: Clock,
      color: 'text-green-600'
    },
    {
      title: 'Avg ON Duration',
      value: formatDuration(Math.round(summary.avgOnDuration || 0)),
      icon: Timer,
      color: 'text-purple-600'
    },
    {
      title: 'Last Action',
      value: summary.lastAction 
        ? `${summary.lastAction.toUpperCase()} — ${formatRelativeTime(summary.lastTimestamp)}`
        : '—',
      icon: Zap,
      color: summary.lastAction === 'on' ? 'text-green-600' : 'text-red-600'
    }
  ];
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${card.color}`}>
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}