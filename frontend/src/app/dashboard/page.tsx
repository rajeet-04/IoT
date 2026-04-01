'use client';

import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { useDeviceStore } from '@/store/deviceStore';
import ConnectionStatus from '@/components/dashboard/connection-status';
import DeviceCard from '@/components/dashboard/device-card';
import { getBackendUrl } from '@/lib/api';
import { Cpu } from 'lucide-react';

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
            <header className="sticky top-0 z-30 bg-white border-b px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {devices.length} device{devices.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <ConnectionStatus status={wsStatus} />
                </div>
            </header>

            {/* Content */}
            <div className="p-4 sm:p-6">
                {devices.length === 0 ? (
                    // Empty state
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Cpu className="w-8 h-8 text-gray-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            No devices registered
                        </h2>
                        <p className="text-gray-500 mb-6 max-w-md">
                            Connect your ESP32 device to the backend to start controlling it remotely.
                        </p>
                        <p className="text-sm text-gray-400">
                            See the firmware documentation for setup instructions.
                        </p>
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
