'use client';

import { useState } from 'react';
import { Wifi, WifiOff, Pencil, Check, X } from 'lucide-react';
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
        <div className="card p-4 sm:p-6 hover:shadow-lg transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="input py-1 px-2 text-lg font-semibold"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSave();
                                    if (e.key === 'Escape') handleCancel();
                                }}
                            />
                            <button
                                onClick={handleSave}
                                className="btn btn-primary py-1 px-2"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleCancel}
                                className="btn btn-secondary py-1 px-2"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg sm:text-xl font-semibold truncate">
                                {device.name}
                            </h3>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <p className="text-xs text-gray-500 font-mono truncate mt-1">
                        {device.deviceId}
                    </p>
                </div>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-2 mb-4">
                <span
                    className={`
                        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                        ${device.isConnected 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-500'
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
            <div className="text-xs text-gray-500 text-center">
                Last seen: {formatRelativeTime(device.lastSeen)}
            </div>
        </div>
    );
}
