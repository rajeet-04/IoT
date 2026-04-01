'use client';

import { Wifi, WifiOff, Loader2 } from 'lucide-react';

interface ConnectionStatusProps {
    status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
}

export default function ConnectionStatus({ status }: ConnectionStatusProps) {
    const config = {
        connecting: {
            color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
            dot: 'bg-yellow-500 animate-pulse',
            text: 'Connecting...',
            icon: Loader2,
        },
        connected: {
            color: 'bg-green-50 text-green-700 border-green-200',
            dot: 'bg-green-500 animate-pulse',
            text: 'Connected',
            icon: Wifi,
        },
        disconnected: {
            color: 'bg-red-50 text-red-700 border-red-200',
            dot: 'bg-red-500',
            text: 'Disconnected',
            icon: WifiOff,
        },
        reconnecting: {
            color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
            dot: 'bg-yellow-500 animate-ping',
            text: 'Reconnecting...',
            icon: WifiOff,
        },
    };

    const { color, dot, text, icon: Icon } = config[status];

    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${color}`}>
            <span className={`w-2 h-2 rounded-full ${dot}`} />
            <Icon className={`w-4 h-4 ${status === 'connecting' || status === 'reconnecting' ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">{text}</span>
        </div>
    );
}
