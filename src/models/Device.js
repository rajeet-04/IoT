import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  deviceId: {
    type: String,
    required: [true, 'Device ID is required'],
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    default: function () {
      return `Device-${this.deviceId?.slice(0, 8) || 'unknown'}`;
    },
  },
  status: {
    type: String,
    enum: ['offline', 'online'],
    default: 'offline',
  },
  lastSeen: {
    type: Date,
  },
  relayState: {
    type: Boolean,
    default: false,
  },
  distanceCm: {
    type: Number,
    default: null,
  },
  distanceValid: {
    type: Boolean,
    default: false,
  },
  motionEnabled: {
    type: Boolean,
    default: true,
  },
  movementThresholdCm: {
    type: Number,
    min: 1,
    max: 400,
    default: 10,
  },
  wifiConnected: { type: Boolean, default: false },
  wifiRssi: { type: Number, default: -100 },
  sensorDegraded: { type: Boolean, default: false },
  sensorInvalidReads: { type: Number, default: 0 },
  freeHeap: { type: Number, default: null },
  lastSensorEvent: { type: String, default: null },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

deviceSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const Device = mongoose.model('Device', deviceSchema);

export default Device;
