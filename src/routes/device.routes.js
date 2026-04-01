import express from 'express';
import { z } from 'zod';
import Device from '../models/Device.js';
import Transaction from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { generateDeviceToken } from '../utils/deviceToken.js';
import { getRegistry } from '../ws/hub.js';

const router = express.Router();

// All device routes require authentication
router.use(requireAuth);

// Zod validation schemas
const createDeviceSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(50, 'Name cannot exceed 50 characters').optional(),
});

const updateDeviceSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(50, 'Name cannot exceed 50 characters'),
});

// POST /api/devices — Register a new ESP32 device
router.post('/', async (req, res, next) => {
  try {
    const result = createDeviceSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors,
      });
    }

    const deviceToken = generateDeviceToken();
    const device = await Device.create({
      userId: req.userId,
      deviceId: deviceToken,
      name: result.data.name, // undefined → schema default will apply
    });

    // Token is returned ONCE — user must flash it to their ESP32
    return res.status(201).json({
      device: {
        id: device._id,
        deviceId: device.deviceId,
        name: device.name,
        token: deviceToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/devices — List all devices for authenticated user
router.get('/', async (req, res, next) => {
  try {
    const devices = await Device.find({ userId: req.userId }).sort({ createdAt: -1 });
    return res.status(200).json({
      devices: devices.map((d) => ({
        id: d._id,
        deviceId: d.deviceId,
        name: d.name,
        status: d.status,
        lastSeen: d.lastSeen,
        relayState: d.relayState,
        createdAt: d.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/devices/:id — Get a specific device (must belong to user)
router.get('/:id', async (req, res, next) => {
  try {
    const device = await Device.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    return res.status(200).json({
      device: {
        id: device._id,
        deviceId: device.deviceId,
        name: device.name,
        status: device.status,
        lastSeen: device.lastSeen,
        relayState: device.relayState,
        createdAt: device.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/devices/:id — Update device name (must belong to user)
router.put('/:id', async (req, res, next) => {
  try {
    const result = updateDeviceSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors,
      });
    }

    const device = await Device.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { name: result.data.name, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    return res.status(200).json({
      device: {
        id: device._id,
        deviceId: device.deviceId,
        name: device.name,
        status: device.status,
        lastSeen: device.lastSeen,
      },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/devices/:id — Delete a device (must belong to user)
router.delete('/:id', async (req, res, next) => {
  try {
    const device = await Device.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    return res.status(200).json({ message: 'Device deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/devices/:id/command — Send command to device via WebSocket
router.post('/:id/command', async (req, res, next) => {
  try {
    const { action } = req.body;
    
    if (!action || !['turn_on', 'turn_off', 'toggle'].includes(action)) {
      return res.status(400).json({ 
        error: 'Invalid action. Must be: turn_on, turn_off, or toggle' 
      });
    }

    // Find device (must belong to user)
    const device = await Device.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = new Date();
    
    const newRelayState = action === 'turn_on' ? true : action === 'turn_off' ? false : !device.relayState;

    const transaction = await Transaction.create({
      deviceId: device.deviceId,
      userId: req.userId,
      action,
      relayState: newRelayState,
      timestamp,
      commandId,
    });

    // Get registry and send command
    const registry = getRegistry();
    if (!registry) {
      return res.status(500).json({ error: 'WebSocket hub not available' });
    }

    // Check if device is connected
    if (!registry.isConnected(device.deviceId)) {
      return res.status(503).json({ error: 'Device is offline' });
    }

    // Self-heal: If DB says offline but registry says connected
    if (device.status === 'offline') {
      await Device.updateOne(
        { _id: device._id }, 
        { $set: { status: 'online', lastSeen: new Date() } }
      );
    }

    const command = {
      type: 'command',
      commandId,
      action,
      timestamp: timestamp.toISOString()
    };

    const sent = registry.sendCommand(device.deviceId, command);
    if (!sent) {
      return res.status(503).json({ error: 'Failed to send command to device' });
    }

    await Device.updateOne({ _id: device._id }, { $set: { relayState: newRelayState } });

    return res.status(200).json({
      success: true,
      commandId,
      message: `Command ${action} sent to device`,
      transaction: {
        id: transaction._id,
        hash: transaction.hash,
        prevHash: transaction.prevHash,
        action: transaction.action,
        relayState: transaction.relayState,
        timestamp: transaction.timestamp,
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
