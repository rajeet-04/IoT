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

    // Separate blockchain-relevant from non-blockchain pending
    const blockchainPending = pending.filter(tx => 
        tx.walletAddress && tx.walletAddress !== 'unconnected'
    );
    const unconnectedPending = pending.filter(tx => 
        !tx.walletAddress || tx.walletAddress === 'unconnected'
    );

    // Auto-fail old unconnected transactions (no wallet = will never confirm on-chain)
    const EXPIRE_MS = 30 * 60 * 1000; // 30 minutes
    for (const tx of unconnectedPending) {
        const age = Date.now() - new Date(tx.timestamp).getTime();
        if (age > EXPIRE_MS) {
            await failTransaction(tx._id.toString(), 'No wallet connected — cannot confirm on blockchain');
            console.log(`[BLOCKCHAIN] Auto-expired unconnected tx: ${tx._id}`);
        }
    }

    if (blockchainPending.length === 0) {
        return;
    }

    console.log(`[BLOCKCHAIN] Checking ${blockchainPending.length} pending transactions`);

    for (const tx of blockchainPending) {
        try {
            // Skip if already has a txHash (was confirmed by writer but listener not synced yet)
            if (tx.txHash) {
                await confirmTransaction(tx._id.toString(), {
                    txHash: tx.txHash,
                    blockNumber: tx.blockNumber || 0
                });
                continue;
            }

            // Get current block number — queryFilter needs block numbers, NOT timestamps
            const latestBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, latestBlock - 1000); // ~3-4 hours on Sepolia

            const filter = contract.filters.DeviceAction(
                ethers.keccak256(ethers.toUtf8Bytes(tx.deviceId)),  // must match how writer encoded it
                null,  // any action
                null,  // any timestamp
                tx.walletAddress  // indexed user
            );

            const events = await contract.queryFilter(filter, fromBlock, 'latest');

            // Find matching event by wallet + deviceId
            for (const event of events) {
                const [deviceId, action, timestamp, user] = event.args;
                
                if (user.toLowerCase() === tx.walletAddress.toLowerCase()) {
                    await confirmTransaction(tx._id.toString(), {
                        txHash: event.transactionHash,
                        blockNumber: Number(event.blockNumber)
                    });
                    
                    console.log(`[BLOCKCHAIN] Confirmed via listener: ${tx._id} -> ${event.transactionHash}`);
                    break;
                }
            }

            // Auto-fail transactions older than 2 hours without confirmation
            const age = Date.now() - new Date(tx.timestamp).getTime();
            if (age > 2 * 60 * 60 * 1000) {
                await failTransaction(tx._id.toString(), 'Transaction confirmation timeout (2h)');
                console.log(`[BLOCKCHAIN] Timed out: ${tx._id}`);
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