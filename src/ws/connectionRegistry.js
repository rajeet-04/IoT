/**
 * ConnectionRegistry - WebSocket Connection Manager
 * 
 * Tracks active WebSocket connections for ESP32 devices.
 * Automatically updates device status in MongoDB on connect/disconnect.
 */

import Device from '../models/Device.js';

/**
 * ConnectionRegistry - Manages device WebSocket connections
 * 
 * Features:
 * - Map-based connection storage
 * - Automatic MongoDB status updates
 * - Connection count tracking
 */
export class ConnectionRegistry {
    /**
     * Create a new connection registry
     */
    constructor() {
        /** @type {Map<string, import('ws').WebSocket>} */
        this._connections = new Map();
    }

    /**
     * Register a new device connection
     * @param {string} deviceId - Device UUID
     * @param {import('ws').WebSocket} ws - WebSocket connection
     */
    async register(deviceId, ws) {
        this._connections.set(deviceId, ws);
        
        try {
            await Device.updateOne(
                { deviceId },
                { $set: { status: 'online', lastSeen: new Date() } }
            );
            console.log(`[WS Registry] Device ${deviceId} registered, connections: ${this._connections.size}`);
        } catch (error) {
            console.error(`[WS Registry] Failed to update device status:`, error);
        }

        // Auto-cleanup on close
        ws.on('close', () => {
            this.unregister(deviceId).catch(err => {
                console.error(`[WS Registry] Error during cleanup:`, err);
            });
        });
    }

    /**
     * Unregister a device connection
     * @param {string} deviceId - Device UUID
     */
    async unregister(deviceId) {
        const existed = this._connections.has(deviceId);
        this._connections.delete(deviceId);

        try {
            await Device.updateOne(
                { deviceId },
                { $set: { status: 'offline', lastSeen: new Date() } }
            );
            
            if (existed) {
                console.log(`[WS Registry] Device ${deviceId} unregistered, connections: ${this._connections.size}`);
            }
        } catch (error) {
            console.error(`[WS Registry] Failed to update device status:`, error);
        }
    }

    /**
     * Get a connection by device ID
     * @param {string} deviceId - Device UUID
     * @returns {import('ws').WebSocket | null}
     */
    get(deviceId) {
        return this._connections.get(deviceId) || null;
    }

    /**
     * Get all connections
     * @returns {Map<string, import('ws').WebSocket>}
     */
    getAll() {
        return new Map(this._connections);
    }

    /**
     * Check if a device is connected
     * @param {string} deviceId - Device UUID
     * @returns {boolean}
     */
    isConnected(deviceId) {
        return this._connections.has(deviceId);
    }

    /**
     * Get the number of active connections
     * @returns {number}
     */
    get size() {
        return this._connections.size;
    }

    /**
     * Send a command to a device
     * @param {string} deviceId - Device UUID
     * @param {object} command - Command payload
     * @returns {boolean} True if sent successfully
     */
    sendCommand(deviceId, command) {
        const ws = this._connections.get(deviceId);
        if (!ws || ws.readyState !== 1) {
            return false;
        }
        ws.send(JSON.stringify(command));
        return true;
    }
}

export default ConnectionRegistry;
