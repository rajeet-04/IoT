/**
 * Blockchain Listener Service
 * Polls pending transactions for blockchain confirmation
 * and handles transaction confirmation status updates
 */

import { ethers } from 'ethers';
import { confirmTransaction, failTransaction, getPendingTransactions, getTransactionById } from '../services/transactionRecorder.js';

// Contract ABI (events only - for listening)
const CONTRACT_ABI = [
    'event DeviceAction(bytes32 indexed deviceId, string action, uint256 timestamp, address indexed user, bytes32 indexed dbRecordId)'
];

let provider = null;
let contract = null;
let pollInterval = null;
let isInitialized = false;

/**
 * Initialize blockchain listener for transaction confirmations
 * @param {string} rpcUrl - Infura Sepolia RPC URL
 * @param {string} contractAddress - Deployed IOTEventLog address
 */
export function initBlockchainListener(rpcUrl, contractAddress) {
    if (!rpcUrl || !contractAddress) {
        console.warn('[BLOCKCHAIN] RPC URL or contract address not configured - running without blockchain confirmation');
        isInitialized = false;
        return;
    }

    try {
        provider = new ethers.JsonRpcProvider(rpcUrl);
        contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
        isInitialized = true;
        console.log(`[BLOCKCHAIN] Listener initialized for contract ${contractAddress}`);
    } catch (error) {
        console.error('[BLOCKCHAIN] Failed to initialize:', error.message);
        isInitialized = false;
    }
}

/**
 * Start polling for transaction confirmations
 * @param {number} intervalMs - Polling interval in milliseconds (default 30000)
 */
export function startPolling(intervalMs = 30000) {
    if (!isInitialized) {
        console.warn('[BLOCKCHAIN] Cannot start polling - not initialized');
        return;
    }

    if (pollInterval) {
        console.warn('[BLOCKCHAIN] Polling already running');
        return;
    }

    pollInterval = setInterval(async () => {
        try {
            await pollPendingTransactions();
        } catch (error) {
            console.error('[BLOCKCHAIN] Polling error:', error.message);
        }
    }, intervalMs);

    console.log(`[BLOCKCHAIN] Started polling every ${intervalMs}ms`);
}

/**
 * Stop polling
 */
export function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
        console.log('[BLOCKCHAIN] Stopped polling');
    }
}

/**
 * Poll pending transactions for blockchain confirmation
 */
async function pollPendingTransactions() {
    if (!provider || !contract) {
        return;
    }

    const pending = await getPendingTransactions();
    
    if (pending.length === 0) {
        return;
    }

    console.log(`[BLOCKCHAIN] Checking ${pending.length} pending transactions`);

    for (const tx of pending) {
        try {
            // Skip if no wallet address (not a blockchain transaction)
            if (!tx.walletAddress || tx.walletAddress === 'unconnected') {
                continue;
            }

            // Query events for this transaction
            const fromTime = Math.floor(tx.timestamp.getTime() / 1000) - 60; // 1 minute before
            const toTime = Math.floor(Date.now() / 1000) + 60; // 1 minute after

            const filter = contract.filters.DeviceAction(
                ethers.encodeBytes32String(tx.deviceId),
                null,  // any action
                null,  // any timestamp
                tx.walletAddress  // indexed user
            );

            const events = await contract.queryFilter(filter, fromTime, toTime);

            // Find matching event
            for (const event of events) {
                const [deviceId, action, timestamp, user, dbRecordId] = event.args;
                
                // Check if this event matches our transaction
                const actionMap = { 'turn_on': 'on', 'turn_off': 'off' };
                const expectedAction = actionMap[tx.action] || tx.action;
                
                if (deviceId === ethers.encodeBytes32String(tx.deviceId) && 
                    user.toLowerCase() === tx.walletAddress.toLowerCase()) {
                    
                    await confirmTransaction(tx._id.toString(), {
                        txHash: event.transactionHash,
                        blockNumber: Number(event.blockNumber)
                    });
                    
                    console.log(`[BLOCKCHAIN] Confirmed: ${tx._id} -> ${event.transactionHash}`);
                    break;
                }
            }
        } catch (error) {
            console.error(`[BLOCKCHAIN] Error polling ${tx._id}:`, error.message);
        }
    }
}

/**
 * Check if blockchain is reachable
 */
export async function isBlockchainReachable() {
    if (!provider) return false;
    try {
        await provider.getBlockNumber();
        return true;
    } catch {
        return false;
    }
}

/**
 * Get current block number
 */
export async function getBlockNumber() {
    if (!provider) return null;
    try {
        return await provider.getBlockNumber();
    } catch {
        return null;
    }
}

export default {
    initBlockchainListener,
    startPolling,
    stopPolling,
    isBlockchainReachable,
    getBlockNumber,
};