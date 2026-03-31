import express from 'express';
import { z } from 'zod';
import Device from '../models/Device.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { generateDeviceToken } from '../utils/deviceToken.js';

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

export default router;
