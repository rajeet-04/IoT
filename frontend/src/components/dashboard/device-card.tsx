'use client';

import { useState } from 'react';
import { Wifi, WifiOff, Pencil, Check, X, Cpu } from 'lucide-react';
import RelayToggle from './relay-toggle';
import type { Device } from '@/store/deviceStore';

interface DeviceCardProps {
    device: Device;
    onToggle: (deviceId: string, newState: boolean) => void;
    onRename: (deviceId: string, name: string) => void;
}

function formatRelativeTime(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}

export default function DeviceCard({ device, onToggle, onRename }: DeviceCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(device.name);

    const handleSave = () => {
        if (editName.trim() && editName !== device.name) {
            onRename(device.id, editName.trim());
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditName(device.name);
        setIsEditing(false);
    };

    return (
        <div className="app-surface group p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-950/5">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="input py-2 text-base font-semibold"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSave();
                                    if (e.key === 'Escape') handleCancel();
                                }}
                            />
                            <button
                                onClick={handleSave}
                                aria-label="Save device name"
                                className="rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-500"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleCancel}
                                aria-label="Cancel rename"
                                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50"><Cpu className="h-5 w-5 text-indigo-500" /></span>
                            <h3 className="text-lg sm:text-xl font-semibold truncate">
                                {device.name}
                            </h3>
                            <button
                                onClick={() => setIsEditing(true)}
                                aria-label={`Rename ${device.name}`}
                                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <p className="mt-1 truncate text-xs font-mono text-slate-400">
                        {device.deviceId}
                    </p>
                </div>
            </div>

            {/* Status badge */}
            <div className="mb-7 mt-5 flex items-center gap-2">
                <span
                    className={`
                        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                        ${device.isConnected 
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }
                    `}
                >
                    {device.isConnected ? (
                        <Wifi className="w-3.5 h-3.5" />
                    ) : (
                        <WifiOff className="w-3.5 h-3.5" />
                    )}
                    {device.isConnected ? 'Online' : 'Offline'}
                </span>
            </div>

            {/* Relay control */}
            <div className="flex justify-center mb-4">
                <RelayToggle
                    deviceId={device.id}
                    currentState={device.relayState}
                    isOnline={device.status === 'online'}
                    isConnected={device.isConnected}
                    onToggle={onToggle}
                />
            </div>

            {/* Footer - Last seen */}
            <div className="border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
                Last activity {formatRelativeTime(device.lastSeen)}
            </div>
        </div>
    );
}
