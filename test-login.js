import express from 'express';
import bcrypt from 'bcrypt';
import User from './src/models/User.js';
import { connectDB } from './src/db/connection.js';

const app = express();
app.use(express.json());

await connectDB(process.env.MONGODB_URI || 'mongodb+srv://rajeet:xnj3uey821@iot.qpzuwfh.mongodb.net/?appName=iot');

const user = await User.findOne({ email: 'rajeetash@hotmail.com' });
console.log('User:', user);
console.log('Hash from DB:', user.passwordHash);

const isValid = await bcrypt.compare('Meek2004', user.passwordHash);
console.log('Password match:', isValid);

process.exit(0);