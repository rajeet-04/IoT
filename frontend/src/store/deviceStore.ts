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
 * WebSocket message types
 */
interface WsMessage {
    type: string;
    [key: string]: unknown;
}

/**
 * Device store state
 */
interface DeviceState {
    devices: Device[];
    wsStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
    pendingCommands: Map<string, PendingCommand>;
    ws: WebSocket | null;
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
 * WebSocket client with auto-reconnect
 */
function createWsClient(
    url: string,
    onMessage: (msg: WsMessage) => void,
    onStatusChange: (status: DeviceState['wsStatus']) => void
): WebSocket {
    let reconnectDelay = 1000;
    const maxDelay = 30000;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
        onStatusChange('connecting');
        
        const ws = new WebSocket(url);
        
        ws.onopen = () => {
            reconnectDelay = 1000; // Reset backoff on success
            onStatusChange('connected');
            console.log('[WS] Connected');
        };

        ws.onclose = () => {
            onStatusChange('reconnecting');
            console.log('[WS] Disconnected, reconnecting...');
            scheduleReconnect();
        };

        ws.onerror = (error) => {
            console.error('[WS] Error:', error);
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data) as WsMessage;
                onMessage(msg);
            } catch (error) {
                console.error('[WS] Parse error:', error);
            }
        };

        return ws;
    }

    function scheduleReconnect() {
        if (reconnectTimer) return;
        
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
            reconnectDelay = Math.min(reconnectDelay * 2, maxDelay);
        }, reconnectDelay);
    }

    return connect();
}

/**
 * Handle incoming WebSocket messages
 */
function handleWsMessage(
    msg: WsMessage,
    set: (state: Partial<DeviceState>) => void,
    get: () => DeviceState
) {
    const { devices, pendingCommands } = get();

    switch (msg.type) {
        case 'state_update':
            // Update device state from ESP32
            set({
                devices: devices.map(d => 
                    d.deviceId === msg.deviceId 
                        ? { ...d, relayState: msg.state as boolean, isConnected: true }
                        : d
                )
            });
            break;

        case 'command_response':
            // Update pending command status
            const newPending = new Map(pendingCommands);
            const cmd = newPending.get(msg.commandId as string);
            if (cmd) {
                newPending.set(msg.commandId as string, {
                    ...cmd,
                    status: msg.success ? 'success' : 'error',
                    error: msg.error as string | undefined,
                });
                set({ pendingCommands: newPending });
            }
            break;

        case 'presence_change':
            // Update device presence
            set({
                devices: devices.map(d => 
                    d.deviceId === msg.deviceId 
                        ? { ...d, status: msg.status as 'online' | 'offline', isConnected: msg.status === 'online' }
                        : d
                )
            });
            break;
    }
}

/**
 * Create device store
 */
export const useDeviceStore = create<DeviceState & DeviceActions>((set, get) => ({
    devices: [],
    wsStatus: 'disconnected',
    pendingCommands: new Map(),
    ws: null,

    init: (backendUrl: string) => {
        // Convert http:// to ws://
        const wsUrl = backendUrl.replace(/^http/, 'ws') + '/ws';
        
        const ws = createWsClient(
            wsUrl,
            (msg) => handleWsMessage(msg, set, get),
            (status) => set({ wsStatus: status })
        );
        
        set({ ws, wsStatus: 'connecting' });
        
        // Fetch devices after connection
        get().fetchDevices();
    },

    disconnect: () => {
        const { ws } = get();
        if (ws) {
            ws.close();
            set({ ws: null, wsStatus: 'disconnected' });
        }
    },

    fetchDevices: async () => {
        try {
            const res = await apiGet('/api/devices');
            const data = await res.json();
            set({
                devices: data.devices.map((d: { _id: string; deviceId: string; name: string; status: string; lastSeen: string | null; relayState?: boolean }) => ({
                    id: d._id,
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
