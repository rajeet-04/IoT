/**
 * WebSocketHub - WebSocket Server for ESP32 Devices
 * 
 * Provides WebSocket endpoint at /ws for ESP32 device connections.
 * Features:
 * - Device token authentication
 * - Connection registry
 * - Ping/pong heartbeat (30 second interval)
 * - Message routing
 * - Graceful shutdown
 */

import { WebSocketServer } from 'ws';
import Device from '../models/Device.js';
import { ConnectionRegistry } from './connectionRegistry.js';
import { routeMessage } from './messageRouter.js';

/** @type {ConnectionRegistry | null} */
let registry = null;

/** @type {WebSocketServer | null} */
let wss = null;

/** @type {NodeJS.Timeout | null} */
let presenceCheckInterval = null;

/**
 * Attach WebSocket hub to Express server
 * @param {import('http').Server} server - HTTP server instance
 * @returns {{ wss: WebSocketServer, registry: ConnectionRegistry }}
 */
export function attachWebSocketHub(server) {
    registry = new ConnectionRegistry();
    
    wss = new WebSocketServer({ 
        server,
        path: '/ws'
    });

    console.log('[WS Hub] WebSocket server initializing...');

    wss.on('connection', async (ws, req) => {
        const clientIp = req.socket.remoteAddress || 'unknown';
        console.log(`[WS Hub] New connection from ${clientIp}`);

        // Extract Authorization header
        const authHeader = req.headers['authorization'];
        
        // Validate auth header
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.warn(`[WS Hub] Missing or invalid Authorization header from ${clientIp}`);
            ws.close(4001, 'Unauthorized');
            return;
        }

        // Extract token
        const token = authHeader.slice(7);
        
        if (!token || token.length < 10) {
            console.warn(`[WS Hub] Invalid token format from ${clientIp}`);
            ws.close(4001, 'Unauthorized');
            return;
        }

        // Validate token against database
        try {
            const device = await Device.findOne({ deviceId: token });
            
            if (!device) {
                console.warn(`[WS Hub] Device not found: ${token.substring(0, 8)}...`);
                ws.close(4003, 'Device not registered');
                return;
            }

            const deviceId = device.deviceId;
            
            // Check if device already connected
            if (registry.isConnected(deviceId)) {
                console.warn(`[WS Hub] Device ${deviceId} already connected - replacing connection`);
                await registry.unregister(deviceId);
            }

            // Register connection
            await registry.register(deviceId, ws);
            
            // Store device info on WebSocket
            ws.deviceId = deviceId;
            ws.isWebClient = false;

            // Send welcome message with initial state
            ws.send(JSON.stringify({
                type: 'welcome',
                deviceId: deviceId,
                relayState: device.relayState ? 1 : 0,
                timestamp: new Date().toISOString()
            }));

            console.log(`[WS Hub] Device ${deviceId} connected successfully`);

            // Set up ping interval (30 seconds)
            const pingInterval = setInterval(() => {
                if (ws.readyState === 1) { // OPEN = 1
                    ws.ping();
                    // Set pong timeout (10 seconds)
                    ws._pongTimeout = setTimeout(() => {
                        console.warn(`[WS Hub] Pong timeout for ${deviceId} - terminating`);
                        ws.terminate();
                    }, 10000);
                }
            }, 30000);

            // Handle pong response
            ws.on('pong', () => {
                if (ws._pongTimeout) {
                    clearTimeout(ws._pongTimeout);
                    ws._pongTimeout = null;
                }
            });

            // Handle incoming messages
            ws.on('message', async (data) => {
                try {
                    const message = data.toString();
                    await routeMessage(deviceId, message, registry);
                } catch (error) {
                    console.error(`[WS Hub] Error routing message from ${deviceId}:`, error);
                }
            });

            // Handle close
            ws.on('close', async (code, reason) => {
                clearInterval(pingInterval);
                if (ws._pongTimeout) {
                    clearTimeout(ws._pongTimeout);
                }
                console.log(`[WS Hub] Device ${deviceId} disconnected (code: ${code})`);
                await registry.unregister(deviceId);
            });

            // Handle errors
            ws.on('error', async (error) => {
                console.error(`[WS Hub] Error for ${deviceId}:`, error.message);
                clearInterval(pingInterval);
                if (ws._pongTimeout) {
                    clearTimeout(ws._pongTimeout);
                }
                await registry.unregister(deviceId);
            });

        } catch (error) {
            console.error('[WS Hub] Error during authentication:', error);
            ws.close(4002, 'Authentication error');
        }
    });

    wss.on('error', (error) => {
        console.error('[WS Hub] WebSocket server error:', error);
    });

    // Start presence check (every 30 seconds)
    startPresenceMonitor();

    console.log('[WS Hub] WebSocket server ready at /ws');
    console.log(`[WS Hub] ${registry.size} devices connected`);

    return { wss, registry };
}

/**
 * Start presence monitoring - mark stale devices as offline
 */
function startPresenceMonitor() {
    const STALE_THRESHOLD_MS = 90000; // 90 seconds
    
    presenceCheckInterval = setInterval(async () => {
        if (!registry) return;
        
        try {
            const threshold = new Date(Date.now() - STALE_THRESHOLD_MS);
            
            // Find devices marked online but no recent heartbeat
            const staleDevices = await Device.find({
                lastSeen: { $lt: threshold },
                status: 'online'
            });

            for (const device of staleDevices) {
                console.warn(`[WS Presence] Device ${device.deviceId} stale (last seen: ${device.lastSeen})`);
                
                // Update status to offline
                await Device.updateOne(
                    { deviceId: device.deviceId },
                    { $set: { status: 'offline' } }
                );
                
                // Remove from registry if still present
                if (registry.isConnected(device.deviceId)) {
                    await registry.unregister(device.deviceId);
                }
            }
        } catch (error) {
            console.error('[WS Presence] Error during presence check:', error);
        }
    }, 1000); // Check every 1 seconds
}

/**
 * Stop presence monitoring
 */
function stopPresenceMonitor() {
    if (presenceCheckInterval) {
        clearInterval(presenceCheckInterval);
        presenceCheckInterval = null;
    }
}

/**
 * Broadcast a message to all connected web clients subscribed to a device
 * @param {string} deviceId - Device UUID
 * @param {object} message - Message to broadcast
 */
export function broadcastToDeviceSubscribers(deviceId, message) {
    if (!wss) return;
    
    const payload = JSON.stringify(message);
    
    wss.clients.forEach((client) => {
        if (
            client.isWebClient && 
            client.subscribedDevices && 
            client.subscribedDevices.has(deviceId) &&
            client.readyState === 1
        ) {
            client.send(payload);
        }
    });
}

/**
 * Get the connection registry
 * @returns {ConnectionRegistry | null}
 */
export function getRegistry() {
    return registry;
}

/**
 * Gracefully shutdown the WebSocket hub
 * @returns {Promise<void>}
 */
export async function shutdownWebSocketHub() {
    console.log('[WS Hub] Shutting down...');
    
    stopPresenceMonitor();
    
    if (wss) {
        // Notify all clients
        wss.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(JSON.stringify({
                    type: 'server_shutdown',
                    message: 'Server is restarting'
                }));
                client.close(1001, 'Server shutting down');
            }
        });

        // Close server
        await new Promise((resolve) => {
            wss.close(resolve);
        });
        
        console.log('[WS Hub] WebSocket server closed');
    }
    
    registry = null;
    wss = null;
}

export default {
    attachWebSocketHub,
    broadcastToDeviceSubscribers,
    getRegistry,
    shutdownWebSocketHub
};
