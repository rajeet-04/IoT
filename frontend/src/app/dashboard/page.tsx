'use client';

import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { useDeviceStore } from '@/store/deviceStore';
import ConnectionStatus from '@/components/dashboard/connection-status';
import DeviceCard from '@/components/dashboard/device-card';
import { getBackendUrl } from '@/lib/api';
import { Cpu, Plus, Radio, Zap } from 'lucide-react';

export default function DashboardPage() {
    const { devices, wsStatus, init, sendCommand, renameDevice } = useDeviceStore();

    useEffect(() => {
        // Initialize WebSocket connection
        const backendUrl = getBackendUrl();
        init(backendUrl);

        // Cleanup on unmount
        return () => {
            useDeviceStore.getState().disconnect();
        };
    }, []);

    // Handle toggle command
    const handleToggle = (deviceId: string, newState: boolean) => {
        const action = newState ? 'turn_on' : 'turn_off';
        sendCommand(deviceId, action, {});
        toast.loading(`Turning ${newState ? 'ON' : 'OFF'}...`, { id: `toggle-${deviceId}` });
    };

    // Handle rename
    const handleRename = (deviceId: string, name: string) => {
        renameDevice(deviceId, name);
        toast.success(`Device renamed to "${name}"`);
    };

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-slate-50/90 px-5 py-5 backdrop-blur sm:px-8">
                <div className="flex items-center justify-between gap-4 pl-12 lg:pl-0">
                    <div>
                        <p className="eyebrow">Overview</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Device dashboard</h1>
                        <p className="mt-1 text-sm text-slate-500">Manage your connected relays in real time.</p>
                    </div>
                    <ConnectionStatus status={wsStatus} />
                </div>
            </header>

            {/* Content */}
            <div className="mx-auto max-w-7xl p-5 sm:p-8">
                <div className="mb-6 grid gap-4 sm:grid-cols-3">
                    <div className="app-surface p-4"><div className="flex items-center justify-between text-sm text-slate-500">Registered devices <Cpu className="h-4 w-4 text-indigo-500" /></div><p className="mt-3 text-3xl font-bold">{devices.length}</p></div>
                    <div className="app-surface p-4"><div className="flex items-center justify-between text-sm text-slate-500">Online now <Radio className="h-4 w-4 text-emerald-500" /></div><p className="mt-3 text-3xl font-bold">{devices.filter((device) => device.isConnected).length}</p></div>
                    <div className="app-surface p-4"><div className="flex items-center justify-between text-sm text-slate-500">Relays active <Zap className="h-4 w-4 text-amber-500" /></div><p className="mt-3 text-3xl font-bold">{devices.filter((device) => device.relayState).length}</p></div>
                </div>
                {devices.length === 0 ? (
                    // Empty state
                    <div className="app-surface flex flex-col items-center justify-center px-6 py-20 text-center">
                        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
                            <Cpu className="h-8 w-8 text-indigo-500" />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold text-slate-900">
                            No devices registered
                        </h2>
                        <p className="mb-6 max-w-md text-slate-500">
                            Connect your ESP32 device to the backend to start controlling it remotely.
                        </p>
                        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-sm text-slate-500"><Plus className="h-4 w-4" /> See the firmware documentation to register your first device.</div>
                    </div>
                ) : (
                    // Device grid
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {devices.map((device) => (
                            <DeviceCard
                                key={device.id}
                                device={device}
                                onToggle={handleToggle}
                                onRename={handleRename}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Toast container */}
            <Toaster 
                position="top-right" 
                expand={false} 
                richColors 
                closeButton
            />
        </div>
    );
}
