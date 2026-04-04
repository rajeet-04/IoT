import mongoose from 'mongoose';
import crypto from 'crypto';

const transactionSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: [true, 'Device ID is required'],
        index: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true,
    },
    action: {
        type: String,
        enum: ['turn_on', 'turn_off', 'toggle'],
        required: [true, 'Action is required'],
    },
    relayState: {
        type: Boolean,
        required: [true, 'Relay state is required'],
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
    prevHash: {
        type: String,
        required: [true, 'Previous hash is required'],
    },
    hash: {
        type: String,
        required: [true, 'Hash is required'],
        unique: true,
    },
    commandId: {
        type: String,
    },
    duration: {
        type: Number,
        default: null,
    },
    // NEW: Blockchain fields
    walletAddress: {
        type: String,
        lowercase: true,
        sparse: true,
    },
    txHash: {
        type: String,
    },
    blockNumber: {
        type: Number,
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'failed'],
        default: 'pending',
        index: true,
    },
    contractAddress: {
        type: String,
        default: process.env.CONTRACT_ADDRESS,
    },
});

transactionSchema.index({ deviceId: 1, timestamp: -1 });
transactionSchema.index({ userId: 1, timestamp: -1 });
transactionSchema.index({ walletAddress: 1, timestamp: -1 });
transactionSchema.index({ txHash: 1 }, { sparse: true });

function computeHash(data) {
    const dataStr = JSON.stringify(data);
    return crypto.createHash('sha256').update(dataStr).digest('hex');
}

transactionSchema.pre('validate', async function (next) {
    if (!this.isNew) {
        return next();
    }

    const deviceId = this.deviceId;
    const timestamp = this.timestamp || new Date();
    
    try {
        const lastTransaction = await mongoose.model('Transaction').findOne({ deviceId })
            .sort({ timestamp: -1 });
        
        this.prevHash = lastTransaction?.hash || '0'.repeat(64);
        
        const hashData = {
            deviceId: this.deviceId,
            userId: this.userId.toString(),
            action: this.action,
            relayState: this.relayState,
            timestamp: timestamp.toISOString(),
            prevHash: this.prevHash,
            commandId: this.commandId,
        };
        
        this.hash = computeHash(hashData);
        
        if (lastTransaction) {
            const lastEndTime = lastTransaction.timestamp.getTime();
            const thisStartTime = timestamp.getTime();
            this.duration = Math.floor((thisStartTime - lastEndTime) / 1000);
        }
        
        next();
    } catch (error) {
        next(error);
    }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
