import express from 'express';
import { z } from 'zod';
import Transaction from '../models/Transaction.js';
import Device from '../models/Device.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { 
    getTransactionHistory, 
    getTransactionSummary,
    getTransactionById 
} from '../services/transactionRecorder.js';

const router = express.Router();

router.use(requireAuth);

const ETHERSCAN_BASE = 'https://sepolia.etherscan.io';

// Query validation schema
const historyQuerySchema = z.object({
    limit: z.coerce.number().min(1).max(100).default(50),
    skip: z.coerce.number().min(0).default(0),
    sort: z.enum(['asc', 'desc']).default('desc')
});

// GET /api/transactions - List transactions (existing)
const querySchema = z.object({
    deviceId: z.string().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
});

router.get('/', async (req, res, next) => {
    try {
        const result = querySchema.safeParse(req.query);
        if (!result.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: result.error.errors,
            });
        }

        const { deviceId, limit = 50, offset = 0 } = result.data;

        const query = { userId: req.userId };
        if (deviceId) {
            const device = await Device.findOne({ deviceId: deviceId, userId: req.userId });
            if (!device) {
                return res.status(404).json({ error: 'Device not found' });
            }
            query.deviceId = device.deviceId;
        }

        const transactions = await Transaction.find(query)
            .sort({ timestamp: -1 })
            .skip(offset)
            .limit(limit);

        const total = await Transaction.countDocuments(query);

        return res.status(200).json({
            transactions: transactions.map(t => ({
                id: t._id,
                deviceId: t.deviceId,
                action: t.action,
                relayState: t.relayState,
                timestamp: t.timestamp,
                hash: t.hash,
                prevHash: t.prevHash,
                commandId: t.commandId,
                duration: t.duration,
                // Blockchain fields
                walletAddress: t.walletAddress,
                txHash: t.txHash,
                blockNumber: t.blockNumber,
                status: t.status,
                etherscanUrl: t.txHash ? `${ETHERSCAN_BASE}/tx/${t.txHash}` : null,
            })),
            total,
            limit,
            offset,
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/transactions/:deviceId/history - Paginated history with Etherscan links
router.get('/:deviceId/history', async (req, res, next) => {
    try {
        // Validate device ownership
        const device = await Device.findOne({
            deviceId: req.params.deviceId,
            userId: req.userId,
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        // Parse and validate query params
        const { limit, skip, sort } = historyQuerySchema.parse(req.query);

        // Get history
        const result = await getTransactionHistory(device.deviceId, { limit, skip, sort });

        // Add Etherscan links
        const transactions = result.transactions.map(tx => ({
            ...tx,
            etherscanUrl: tx.txHash 
                ? `${ETHERSCAN_BASE}/tx/${tx.txHash}`
                : null,
            etherscanAddress: tx.walletAddress
                ? `${ETHERSCAN_BASE}/address/${tx.walletAddress}`
                : null
        }));

        res.json({
            transactions,
            total: result.total,
            limit: result.limit,
            skip: result.skip,
            hasMore: result.hasMore
        });
    } catch (error) {
        console.error('Error fetching transaction history:', error);
        res.status(500).json({ error: 'Failed to fetch transaction history' });
    }
});

// GET /api/transactions/:deviceId/summary - Duration metrics
router.get('/:deviceId/summary', async (req, res) => {
    try {
        const device = await Device.findOne({
            deviceId: req.params.deviceId,
            userId: req.userId,
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const summary = await getTransactionSummary(device.deviceId);

        res.json({
            deviceId: device.deviceId,
            ...summary
        });
    } catch (error) {
        console.error('Error fetching summary:', error);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
});

// GET /api/transactions/device/:deviceId/:txId - Single transaction detail
router.get('/device/:deviceId/:txId', async (req, res) => {
    try {
        const device = await Device.findOne({
            deviceId: req.params.deviceId,
            userId: req.userId,
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const tx = await getTransactionById(req.params.txId);

        if (!tx || tx.deviceId !== device.deviceId) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json({
            ...tx,
            etherscanUrl: tx.txHash 
                ? `${ETHERSCAN_BASE}/tx/${tx.txHash}`
                : null,
            etherscanBlock: tx.blockNumber
                ? `${ETHERSCAN_BASE}/block/${tx.blockNumber}`
                : null,
            etherscanAddress: tx.walletAddress
                ? `${ETHERSCAN_BASE}/address/${tx.walletAddress}`
                : null
        });
    } catch (error) {
        console.error('Error fetching transaction:', error);
        res.status(500).json({ error: 'Failed to fetch transaction' });
    }
});

// GET /api/transactions/wallet/:walletAddress - Transactions by wallet
router.get('/wallet/:walletAddress', async (req, res) => {
    try {
        const { limit, skip, sort } = historyQuerySchema.parse(req.query);

        // Validate that requested wallet belongs to user
        const user = await User.findById(req.userId);

        if (!user || user.walletAddress?.toLowerCase() !== req.params.walletAddress.toLowerCase()) {
            return res.status(403).json({ error: 'Cannot view other user\'s transactions' });
        }

        const query = { walletAddress: req.params.walletAddress.toLowerCase() };

        const [transactions, total] = await Promise.all([
            Transaction.find(query)
                .sort({ timestamp: sort === 'asc' ? 1 : -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Transaction.countDocuments(query)
        ]);

        const txs = transactions.map(tx => ({
            ...tx,
            etherscanUrl: tx.txHash 
                ? `${ETHERSCAN_BASE}/tx/${tx.txHash}`
                : null
        }));

        res.json({
            transactions: txs,
            total,
            limit,
            skip,
            hasMore: skip + limit < total
        });
    } catch (error) {
        console.error('Error fetching wallet transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// GET /api/transactions/:id - Get single transaction (existing)
router.get('/:id', async (req, res, next) => {
    try {
        const transaction = await Transaction.findOne({
            _id: req.params.id,
            userId: req.userId,
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        return res.status(200).json({
            transaction: {
                id: transaction._id,
                deviceId: transaction.deviceId,
                action: transaction.action,
                relayState: transaction.relayState,
                timestamp: transaction.timestamp,
                hash: transaction.hash,
                prevHash: transaction.prevHash,
                commandId: transaction.commandId,
                duration: transaction.duration,
                // Blockchain fields
                walletAddress: transaction.walletAddress,
                txHash: transaction.txHash,
                blockNumber: transaction.blockNumber,
                status: transaction.status,
            },
        });
    } catch (err) {
        next(err);
    }
});

export default router;
