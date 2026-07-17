/**
 * MessageRouter - WebSocket Message Handler
 * 
 * Routes incoming messages from ESP32 devices based on message type.
 * Handles heartbeat, state reports, acknowledgments, and errors.
 */

import Device from '../models/Device.js';

/**
 * Route an incoming message from a device
 * @param {string} deviceId - Device UUID (from token)
 * @param {string|object} message - Raw message data or parsed JSON
 * @param {import('./connectionRegistry.js').ConnectionRegistry} registry - Connection registry
 * @returns {Promise<void>}
 */
export async function routeMessage(deviceId, message, registry) {
    let msg;
    
    // Parse message if string
    if (typeof message === 'string') {
        try {
            msg = JSON.parse(message);
        } catch (error) {
            console.error(`[WS Router] Failed to parse message from ${deviceId}:`, error.message);
            return;
        }
    } else {
        msg = message;
    }

    // Validate message structure
    if (!msg || typeof msg !== 'object') {
        console.error(`[WS Router] Invalid message format from ${deviceId}`);
        return;
    }

    const { type } = msg;
    
    if (!type) {
        console.warn(`[WS Router] Message without type from ${deviceId}:`, msg);
        return;
    }

    try {
        switch (type) {
            case 'heartbeat':
                await handleHeartbeat(deviceId, msg);
                break;
                
            case 'state_report':
                await handleStateReport(deviceId, msg, registry);
                break;
                
            case 'ack':
                handleAck(deviceId, msg);
                break;
                
            case 'error':
                handleError(deviceId, msg);
                break;
                
            default:
                console.warn(`[WS Router] Unknown message type "${type}" from ${deviceId}`);
                // Send error response
                const ws = registry.get(deviceId);
                if (ws && ws.readyState === 1) { // OPEN = 1
                    ws.send(JSON.stringify({
                        type: 'error',
                        code: 'UNKNOWN_TYPE',
                        message: `Unknown message type: ${type}`
                    }));
                }
        }
    } catch (error) {
        console.error(`[WS Router] Error handling ${type} message from ${deviceId}:`, error);
        // Don't crash on errors - log and continue
    }
}

/**
 * Handle heartbeat message - update lastSeen timestamp
 * @param {string} deviceId
 * @param {object} msg
 */
async function handleHeartbeat(deviceId, msg) {
    try {
        await Device.updateOne(
            { deviceId },
            { $set: { lastSeen: new Date(), status: 'online' } }
        );
        console.log(`[WS Heartbeat] Device ${deviceId} alive (uptime: ${msg.uptime || 'unknown'}ms)`);
    } catch (error) {
        console.error(`[WS Heartbeat] Failed to update lastSeen for ${deviceId}:`, error.message);
    }
}

/**
 * Handle state report - update device shadow state
 * @param {string} deviceId
 * @param {object} msg
 * @param {import('./connectionRegistry.js').ConnectionRegistry} registry
 */
async function handleStateReport(deviceId, msg, registry) {
    try {
        const relayState = msg.relay !== undefined ? msg.relay : msg.relayState;
        const update = {
            lastSeen: new Date(),
            status: 'online',
            relayState: Boolean(relayState),
        };

        if (typeof msg.distanceCm === 'number') {
            update.distanceCm = msg.distanceCm;
            update.distanceValid = msg.distanceValid === true && msg.distanceCm >= 0;
        }
        if (typeof msg.wifiConnected === 'boolean') update.wifiConnected = msg.wifiConnected;
        if (typeof msg.wifiRssi === 'number') update.wifiRssi = msg.wifiRssi;
        if (typeof msg.sensorDegraded === 'boolean') update.sensorDegraded = msg.sensorDegraded;
        if (typeof msg.sensorInvalidReads === 'number') update.sensorInvalidReads = msg.sensorInvalidReads;
        if (typeof msg.freeHeap === 'number') update.freeHeap = msg.freeHeap;
        if (typeof msg.event === 'string') update.lastSensorEvent = msg.event;
        
        // Update lastSeen and relayState
        await Device.updateOne(
            { deviceId },
            { $set: update }
        );
        
        console.log(`[WS State] Device ${deviceId} state: ${relayState ? 'ON' : 'OFF'}`);
    } catch (error) {
        console.error(`[WS State] Failed to update state for ${deviceId}:`, error.message);
    }
}

/**
 * Handle acknowledgment from device
 * @param {string} deviceId
 * @param {object} msg
 */
function handleAck(deviceId, msg) {
    const { commandId, status, relayState } = msg;
    console.log(
        `[WS ACK] Device ${deviceId} acknowledged command ${commandId}: ${status}` +
        (relayState !== undefined ? ` (relay: ${relayState ? 'ON' : 'OFF'})` : '')
    );
}

/**
 * Handle error message from device
 * @param {string} deviceId
 * @param {object} msg
 */
function handleError(deviceId, msg) {
    const { code, message } = msg;
    console.error(`[WS Device Error] Device ${deviceId}: ${code} - ${message || 'Unknown error'}`);
}

export default { routeMessage };
