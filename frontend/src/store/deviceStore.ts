/**
 * Device Store - Zustand State Management
 * 
 * Manages device state, WebSocket connection, and commands.
 */

import { create } from 'zustand';
import { apiGet, apiPut, apiPost } from '@/lib/api';

/**
 * Device type
 */
export interface Device {
    id: string;
    deviceId: string;
    name: string;
    status: 'online' | 'offline';
    lastSeen: string | null;
    isConnected: boolean;
    relayState: boolean;
}

/**
 * Pending command type
 */
export interface PendingCommand {
    deviceId: string;
    action: string;
    status: 'pending' | 'success' | 'error';
    error?: string;
}

/**
 * Device store state
 */
interface DeviceState {
    devices: Device[];
    wsStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
    pendingCommands: Map<string, PendingCommand>;
    ws: WebSocket | null;
    pollInterval: ReturnType<typeof setInterval> | null;
}

/**
 * Device store actions
 */
interface DeviceActions {
    init: (backendUrl: string) => void;
    disconnect: () => void;
    fetchDevices: () => Promise<void>;
    sendCommand: (deviceId: string, action: string, params: Record<string, unknown>) => void;
    renameDevice: (deviceId: string, name: string) => Promise<void>;
    updateDevice: (deviceId: string, updates: Partial<Device>) => void;
    setWsStatus: (status: DeviceState['wsStatus']) => void;
}


/**
 * Create device store
 */
export const useDeviceStore = create<DeviceState & DeviceActions>((set, get) => ({
    devices: [],
    wsStatus: 'disconnected',
    pendingCommands: new Map(),
    ws: null,
    pollInterval: null,

    init: (_backendUrl: string) => {
        // /ws is for ESP32 device tokens only — use HTTP polling instead
        set({ wsStatus: 'connected' });
        
        // Fetch immediately
        get().fetchDevices();

        // Poll every 10 seconds to keep device list fresh
        const pollInterval = setInterval(() => {
            get().fetchDevices();
        }, 10000);

        set({ pollInterval });
    },

    disconnect: () => {
        const { pollInterval } = get();
        if (pollInterval) {
            clearInterval(pollInterval);
            set({ pollInterval: null, wsStatus: 'disconnected' });
        }
    },

    fetchDevices: async () => {
        try {
            const res = await apiGet('/api/devices');
            const data = await res.json();
            set({
                devices: data.devices.map((d: { id: string; deviceId: string; name: string; status: string; lastSeen: string | null; relayState?: boolean }) => ({
                    id: d.id || (d as any)._id,
                    deviceId: d.deviceId,
                    name: d.name,
                    status: d.status as 'online' | 'offline',
                    lastSeen: d.lastSeen,
                    isConnected: d.status === 'online',
                    relayState: d.relayState ?? false,
                }))
            });
        } catch (error) {
            console.error('[Store] Failed to fetch devices:', error);
        }
    },

    sendCommand: async (deviceId: string, action: string, params: Record<string, unknown>) => {
        const { devices, pendingCommands } = get();
        
        // Find device by MongoDB _id
        const device = devices.find(d => d.id === deviceId);
        if (!device) {
            console.error('[Store] Device not found:', deviceId);
            return;
        }

        const commandId = `cmd_${Date.now()}`;
        
        // Add to pending commands
        const newPending = new Map(pendingCommands);
        newPending.set(commandId, { deviceId, action, status: 'pending' });
        set({ pendingCommands: newPending });

        try {
            // Send command via HTTP API
            const res = await apiPost(`/api/devices/${deviceId}/command`, { action });
            const data = await res.json();
            
            if (data.success) {
                const updated = new Map(get().pendingCommands);
                updated.set(commandId, { ...updated.get(commandId)!, status: 'success' });
                set({ pendingCommands: updated });
                
                // Optimistically update relay state
                const newRelayState = action === 'turn_on' ? true : action === 'turn_off' ? false : !device.relayState;
                set({
                    devices: get().devices.map(d => 
                        d.id === deviceId ? { ...d, relayState: newRelayState } : d
                    )
                });
            } else {
                throw new Error(data.error || 'Command failed');
            }
        } catch (error) {
            console.error('[Store] Command failed:', error);
            const updated = new Map(get().pendingCommands);
            updated.set(commandId, { 
                ...updated.get(commandId)!, 
                status: 'error', 
                error: error instanceof Error ? error.message : 'Unknown error' 
            });
            set({ pendingCommands: updated });
        }
        
        // Clear pending after delay
        setTimeout(() => {
            const current = get().pendingCommands.get(commandId);
            if (current?.status !== 'pending') {
                const updated = new Map(get().pendingCommands);
                updated.delete(commandId);
                set({ pendingCommands: updated });
            }
        }, 10000);
    },

    renameDevice: async (deviceId: string, name: string) => {
        try {
            await apiPut(`/api/devices/${deviceId}`, { name });
            set({
                devices: get().devices.map(d => 
                    d.id === deviceId ? { ...d, name } : d
                )
            });
        } catch (error) {
            console.error('[Store] Failed to rename device:', error);
        }
    },

    updateDevice: (deviceId: string, updates: Partial<Device>) => {
        set({
            devices: get().devices.map(d => 
                d.id === deviceId ? { ...d, ...updates } : d
            )
        });
    },

    setWsStatus: (status: DeviceState['wsStatus']) => {
        set({ wsStatus: status });
    },
}));

export default useDeviceStore;
