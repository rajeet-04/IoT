/**
 * ESP32 Device Simulator
 * 
 * Simulates an ESP32 device connecting to the backend WebSocket server.
 * Allows testing the full control flow: web dashboard → backend → ESP32 → transaction.
 * 
 * Usage: node src/simulate-esp32.js
 * 
 * Requires backend to be running at ws://localhost:3000/ws
 */

import WebSocket from 'ws';

// Configuration
const WS_URL = process.env.WS_URL || 'ws://localhost:3000/ws';
const DEVICE_TOKEN = process.env.DEVICE_TOKEN || 'a9188147-5281-4a43-a177-0d8f0a20ace3';

// Device state
let ws = null;
let connected = false;
let relayState = 0; // 0 = OFF, 1 = ON
let heartbeatInterval = null;
let reconnectTimeout = null;

/**
 * Connect to WebSocket server
 */
function connect() {
    console.log(`[ESP32] Connecting to ${WS_URL}...`);
    console.log(`[ESP32] Using device token: ${DEVICE_TOKEN}`);
    
    ws = new WebSocket(WS_URL, {
        headers: {
            'Authorization': `Bearer ${DEVICE_TOKEN}`
        }
    });

    ws.on('open', () => {
        console.log('[ESP32] ✓ Connection opened');
        connected = true;
        
        // Clear any reconnect timeout
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }
    });

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            handleServerMessage(message);
        } catch (error) {
            console.error('[ESP32] Failed to parse message:', error.message);
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`[ESP32] ✗ Connection closed (code: ${code}, reason: ${reason || 'none'})`);
        connected = false;
        stopHeartbeat();
        
        // Attempt reconnect after 5 seconds
        console.log('[ESP32] Reconnecting in 5 seconds...');
        reconnectTimeout = setTimeout(connect, 5000);
    });

    ws.on('error', (error) => {
        console.error('[ESP32] WebSocket error:', error.message);
    });

    ws.on('ping', () => {
        console.log('[ESP32] ← Ping received');
    });

    ws.on('pong', () => {
        console.log('[ESP32] ← Pong sent');
    });
}

/**
 * Handle incoming messages from the server
 * @param {object} message - Parsed JSON message
 */
function handleServerMessage(message) {
    const { type } = message;
    
    switch (type) {
        case 'welcome':
            console.log(`[ESP32] ← Welcome message received`);
            console.log(`[ESP32]   Device ID: ${message.deviceId}`);
            console.log(`[ESP32]   Relay State: ${message.relayState === 1 ? 'ON' : 'OFF'}`);
            
            // Start heartbeat after welcome
            startHeartbeat();
            
            // Send initial state
            sendStateReport();
            break;
            
        case 'command':
            handleCommand(message);
            break;
            
        case 'ping':
            // Server ping - respond with pong
            console.log('[ESP32] ← Server ping');
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.pong();
            }
            break;
            
        case 'server_shutdown':
            console.log('[ESP32] ← Server shutdown notification');
            break;
            
        default:
            console.log(`[ESP32] ← Unknown message type: ${type}`, message);
    }
}

/**
 * Handle device command from server
 * @param {object} message - Command message
 */
function handleCommand(message) {
    const { command, commandId } = message;
    
    console.log(`[ESP32] ← Command received: ${command} (ID: ${commandId})`);
    
    // Simulate relay action
    if (command === 'turn_on') {
        relayState = 1;
    } else if (command === 'turn_off') {
        relayState = 0;
    } else {
        console.log(`[ESP32] ⚠ Unknown command: ${command}`);
        sendAck(commandId, 'error', { message: `Unknown command: ${command}` });
        return;
    }
    
    // Simulate hardware delay (10-50ms)
    const delay = Math.floor(Math.random() * 40) + 10;
    setTimeout(() => {
        console.log(`[ESP32] ⚡ Relay changed to: ${relayState === 1 ? 'ON' : 'OFF'}`);
        sendAck(commandId, 'success', { relayState });
        sendStateReport();
    }, delay);
}

/**
 * Send acknowledgment to server
 * @param {string} commandId - Command ID to acknowledge
 * @param {string} status - Status (success/error)
 * @param {object} additional - Additional fields
 */
function sendAck(commandId, status, additional = {}) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('[ESP32] Cannot send ACK - not connected');
        return;
    }
    
    const ack = {
        type: 'ack',
        commandId,
        status,
        relayState,
        ...additional
    };
    
    ws.send(JSON.stringify(ack));
    console.log(`[ESP32] → ACK sent for command ${commandId}: ${status}`);
}

/**
 * Send state report to server
 */
function sendStateReport() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('[ESP32] Cannot send state report - not connected');
        return;
    }
    
    const report = {
        type: 'state_report',
        relay: relayState,
        timestamp: new Date().toISOString()
    };
    
    ws.send(JSON.stringify(report));
    console.log(`[ESP32] → State report sent: relay ${relayState === 1 ? 'ON' : 'OFF'}`);
}

/**
 * Start sending heartbeat messages
 */
function startHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    
    // Send heartbeat every 10 seconds
    heartbeatInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            const heartbeat = {
                type: 'heartbeat',
                uptime: process.uptime() * 1000, // milliseconds
                relayState: relayState,
                rssi: -50 + Math.floor(Math.random() * 20), // Simulated RSSI
                timestamp: new Date().toISOString()
            };
            
            ws.send(JSON.stringify(heartbeat));
            console.log('[ESP32] → Heartbeat sent');
        }
    }, 10000);
    
    console.log('[ESP32] Heartbeat started (every 10 seconds)');
}

/**
 * Stop heartbeat
 */
function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

/**
 * Handle process termination
 */
function handleShutdown() {
    console.log('[ESP32] Shutting down...');
    stopHeartbeat();
    
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
    }
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Client disconnecting');
    }
    
    process.exit(0);
}

// Process signal handlers
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('[ESP32] Uncaught exception:', error);
    handleShutdown();
});

// Start connection
console.log('='.repeat(50));
console.log('ESP32 Device Simulator');
console.log('='.repeat(50));
console.log(`Server: ${WS_URL}`);
console.log(`Device Token: ${DEVICE_TOKEN}`);
console.log('='.repeat(50));

connect();
