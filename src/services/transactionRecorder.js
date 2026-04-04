/**
 * Transaction Recording Service
 * Handles creating, confirming, and querying transaction records
 * with blockchain integration support
 */

import Transaction from '../models/Transaction.js';

/**
 * Create a pending transaction record
 * @param {Object} params
 * @param {string} params.deviceId - Device identifier
 * @param {string} params.userId - User ObjectId
 * @param {string} params.walletAddress - User's connected wallet (optional)
 * @param {string} params.action - 'turn_on', 'turn_off', or 'toggle'
 * @param {boolean} params.relayState - Resulting relay state
 * @param {string} params.commandId - Command identifier
 * @returns {Promise<Transaction>}
 */
export async function createTransaction({ deviceId, userId, walletAddress, action, relayState, commandId }) {
    const transaction = new Transaction({
        deviceId,
        userId,
        walletAddress: walletAddress?.toLowerCase(),
        action,
        relayState,
        timestamp: new Date(),
        status: 'pending',
        commandId,
    });

    await transaction.save();
    console.log(`[TXN] Created pending transaction: ${transaction._id}`);

    return transaction;
}

/**
 * Confirm a transaction with blockchain hash
 * @param {string} txId - MongoDB transaction ID
 * @param {Object} confirmation
 * @param {string} confirmation.txHash - Blockchain transaction hash
 * @param {number} confirmation.blockNumber - On-chain block number
 * @returns {Promise<Transaction>}
 */
export async function confirmTransaction(txId, { txHash, blockNumber }) {
    const transaction = await Transaction.findByIdAndUpdate(
        txId,
        {
            txHash,
            blockNumber,
            status: 'confirmed'
        },
        { new: true }
    );

    if (transaction) {
        console.log(`[TXN] Confirmed transaction: ${txId} -> ${txHash}`);
    }

    return transaction;
}

/**
 * Mark a transaction as failed
 * @param {string} txId - MongoDB transaction ID
 * @param {string} error - Error message
 * @returns {Promise<Transaction>}
 */
export async function failTransaction(txId, error) {
    const transaction = await Transaction.findByIdAndUpdate(
        txId,
        {
            status: 'failed'
        },
        { new: true }
    );

    console.error(`[TXN] Failed transaction: ${txId} - ${error}`);
    return transaction;
}

/**
 * Get transaction history for a device
 * @param {string} deviceId
 * @param {Object} options
 * @param {number} options.limit - Results per page (default 50)
 * @param {number} options.skip - Offset (default 0)
 * @param {string} options.sort - 'asc' or 'desc' (default 'desc')
 */
export async function getTransactionHistory(deviceId, options = {}) {
    const { limit = 50, skip = 0, sort = 'desc' } = options;
    const sortOrder = sort === 'asc' ? 1 : -1;

    const [transactions, total] = await Promise.all([
        Transaction.find({ deviceId })
            .sort({ timestamp: sortOrder })
            .skip(skip)
            .limit(limit)
            .lean(),
        Transaction.countDocuments({ deviceId })
    ]);

    return {
        transactions,
        total,
        limit,
        skip,
        hasMore: skip + limit < total
    };
}

/**
 * Get transaction by blockchain hash
 * @param {string} txHash
 */
export async function getTransactionByHash(txHash) {
    return Transaction.findOne({ txHash }).lean();
}

/**
 * Get transaction by MongoDB ID
 * @param {string} txId
 */
export async function getTransactionById(txId) {
    return Transaction.findById(txId).lean();
}

/**
 * Get transaction summary for a device
 * @param {string} deviceId
 */
export async function getTransactionSummary(deviceId) {
    const stats = await Transaction.aggregate([
        { $match: { deviceId, status: 'confirmed' } },
        {
            $group: {
                _id: null,
                totalTransactions: { $sum: 1 },
                totalOnDuration: { $sum: { $cond: [{ $eq: ['$action', 'turn_on'] }, '$duration', 0] } },
                avgOnDuration: { $avg: { $cond: [{ $eq: ['$action', 'turn_on'] }, '$duration', null] } },
                confirmedCount: { $sum: 1 },
                pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                lastAction: { $last: '$action' },
                lastTimestamp: { $last: '$timestamp' }
            }
        }
    ]);

    if (stats.length === 0) {
        return {
            totalTransactions: 0,
            totalOnDuration: 0,
            avgOnDuration: 0,
            confirmedCount: 0,
            pendingCount: 0,
            lastAction: null,
            lastTimestamp: null
        };
    }

    return {
        ...stats[0],
        lastTimestamp: stats[0].lastTimestamp?.toISOString()
    };
}

/**
 * Get pending transactions for blockchain confirmation
 * @returns {Promise<Transaction[]>}
 */
export async function getPendingTransactions() {
    return Transaction.find({ status: 'pending' }).lean();
}

export default {
    createTransaction,
    confirmTransaction,
    failTransaction,
    getTransactionHistory,
    getTransactionByHash,
    getTransactionById,
    getTransactionSummary,
    getPendingTransactions,
};