import 'dotenv/config';
import express from 'express';
import { z } from 'zod';
import User from './src/models/User.js';
import { hashPassword, verifyPassword } from './src/utils/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
} from './src/utils/jwt.js';
import { connectDB } from './src/db/connection.js';

await connectDB(process.env.MONGODB_URI || 'mongodb+srv://rajeet:xnj3uey821@iot.qpzuwfh.mongodb.net/?appName=iot');

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const email = 'rajeetash@hotmail.com';
const password = 'Meek2004';

const result = loginSchema.safeParse({ email, password });
console.log('Validation result:', result.success ? 'PASSED' : 'FAILED');

if (!result.success) {
  console.log('Validation errors:', result.error.errors);
  process.exit(1);
}

const user = await User.findOne({ email });
console.log('User found:', !!user);

if (!user) {
  console.log('No user found');
  process.exit(1);
}

console.log('User email:', user.email);
console.log('Password hash in DB:', user.passwordHash);

const isValid = await verifyPassword(password, user.passwordHash);
console.log('Password verification:', isValid);

if (isValid) {
  const accessToken = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());
  console.log('Tokens generated successfully');
  console.log('Access token:', accessToken.substring(0, 20) + '...');
} else {
  console.log('Password verification FAILED');
}

process.exit(0);