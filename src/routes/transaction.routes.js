import express from 'express';
import { z } from 'zod';
import Transaction from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

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
            const device = await import('../models/Device.js').then(m => 
                m.default.findOne({ _id: deviceId, userId: req.userId })
            );
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
            })),
            total,
            limit,
            offset,
        });
    } catch (err) {
        next(err);
    }
});

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
            },
        });
    } catch (err) {
        next(err);
    }
});

export default router;
