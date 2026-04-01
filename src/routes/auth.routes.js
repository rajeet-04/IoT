import express from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import User from '../models/User.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from '../utils/jwt.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Zod validation schemas
const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  email: z.string().email('Email is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * Set httpOnly auth cookies on the response.
 */
function setAuthCookies(res, accessToken, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000,
  };

  // Set cookies (for same-domain use)
  res.cookie('accessToken', accessToken, cookieOptions);
  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Also return in body so cross-domain clients can store in localStorage
  return { accessToken, refreshToken };
}

/**
 * Clear auth cookies on the response.
 */
function clearAuthCookies(res) {
  const isProd = process.env.NODE_ENV === 'production';
  const opts = {
    httpOnly: true,
    secure: true,
    sameSite: isProd ? 'none' : 'lax'
  };
  res.clearCookie('accessToken', opts);
  res.clearCookie('refreshToken', opts);
}

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const result = signupSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors,
      });
    }

    const { email, password } = result.data;

    // Check for existing user
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({ email, passwordHash });

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    const tokens = setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      user: { id: user._id, email: user.email },
      ...tokens,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors,
      });
    }

    const { email, password } = result.data;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    const tokens = setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      user: { id: user._id, email: user.email },
      ...tokens,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  clearAuthCookies(res);
  return res.status(200).json({ message: 'Logged out successfully' });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors,
      });
    }

    const { email } = result.data;
    const user = await User.findOne({ email });

    // Always return 200 for security (don't reveal if email exists)
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      // v1: log to console for dev use; v2+ will send email
      console.log(`PASSWORD RESET TOKEN for ${email}: ${resetToken}`);
    }

    return res.status(200).json({
      message: 'If an account exists, a reset token has been generated. Check server console.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors,
      });
    }

    const { token, email, newPassword } = result.data;

    // v1: simple validation — token must be non-empty, email must match a user
    // v2+: use token store with expiry
    const user = await User.findOne({ email });
    if (!user || !token) {
      return res.status(400).json({ error: 'Invalid reset request' });
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — protected
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json({
      user: { id: user._id, email: user.email, createdAt: user.createdAt },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh — refresh access token using refresh cookie
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    const payload = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const newAccessToken = generateAccessToken(user._id.toString());
    const newRefreshToken = generateRefreshToken(user._id.toString());
    setAuthCookies(res, newAccessToken, newRefreshToken);

    return res.status(200).json({ message: 'Tokens refreshed' });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

export default router;
