import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required'],
    minlength: [8, 'Password must be at least 8 characters'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  walletAddress: {
    type: String,
    lowercase: true,
    sparse: true,
    index: true,
  },
});

userSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const User = mongoose.model('User', userSchema);

export default User;
