'use client';

import { useState } from 'react';
import { Power } from 'lucide-react';

interface RelayToggleProps {
    deviceId: string;
    currentState: boolean;
    isOnline: boolean;
    isConnected: boolean;
    onToggle: (deviceId: string, newState: boolean) => void;
}

export default function RelayToggle({
    deviceId,
    currentState,
    isOnline,
    isConnected,
    onToggle,
}: RelayToggleProps) {
    const [isPending, setIsPending] = useState(false);

    const handleToggle = () => {
        if (!isOnline || !isConnected || isPending) return;
        
        setIsPending(true);
        const newState = !currentState;
        onToggle(deviceId, newState);
        
        // Reset pending state after delay (actual state comes from server)
        setTimeout(() => setIsPending(false), 2000);
    };

    const isDisabled = !isOnline || !isConnected || isPending;

    return (
        <button
            onClick={handleToggle}
            disabled={isDisabled}
            className={`
                relative inline-flex items-center gap-3 px-4 py-3 rounded-xl
                transition-all duration-200 min-h-[56px]
                ${currentState 
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' 
                    : 'bg-gray-200 text-gray-700'
                }
                ${isDisabled 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:scale-105 active:scale-95 cursor-pointer'
                }
            `}
            title={isDisabled ? 'Device offline or disconnected' : 'Click to toggle relay'}
        >
            {/* Toggle indicator */}
            <span
                className={`
                    flex items-center justify-center w-10 h-10 rounded-full
                    ${currentState ? 'bg-white/20' : 'bg-white shadow-sm'}
                `}
            >
                <Power className={`w-5 h-5 ${currentState ? '' : 'text-gray-500'}`} />
            </span>

            {/* State label */}
            <span className="font-semibold text-lg">
                {currentState ? 'ON' : 'OFF'}
            </span>

            {/* Pending indicator */}
            {isPending && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-yellow-500"></span>
                </span>
            )}

            {/* Loading spinner when pending */}
            {isPending && (
                <svg className="animate-spin h-5 w-5 ml-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
        </button>
    );
}
