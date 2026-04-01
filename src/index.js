import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { WebSocketServer } from 'ws';
import { connectDB } from './db/connection.js';
import authRoutes from './routes/auth.routes.js';
import deviceRoutes from './routes/device.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import { attachWebSocketHub, shutdownWebSocketHub } from './ws/hub.js';

dotenv.config();

const app = express();

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: true,
        credentials: true,
    })
);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/transactions', transactionRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        websocket: 'available at /ws',
    });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
let server;

/**
 * @type {import('./ws/hub.js').WebSocketServer | null}
 */
let wss = null;

async function gracefulShutdown(signal) {
    console.log(`Received ${signal}. Shutting down gracefully...`);

    const shutdownTimeout = setTimeout(() => {
        console.error('Shutdown timeout exceeded. Forcing exit.');
        process.exit(1);
    }, 1000);

    try {
        // Shutdown WebSocket hub first
        await shutdownWebSocketHub();

        // Close HTTP server
        if (server) {
            await new Promise((resolve) => {
                server.close(resolve);
            });
            console.log('HTTP server closed');
        }

        // Close database connection
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('Database connection closed');
        }

        clearTimeout(shutdownTimeout);
        console.log('Graceful shutdown complete');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err);
        clearTimeout(shutdownTimeout);
        process.exit(1);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
    gracefulShutdown('unhandledRejection');
});

// ─── Startup ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

async function start() {
    try {
        await connectDB(process.env.MONGODB_URI);
        console.log('Database connected');

        server = app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`HTTP: http://localhost:${PORT}`);
            console.log(`WebSocket: ws://localhost:${PORT}/ws`);
        });

        // Attach WebSocket hub to HTTP server
        const ws = attachWebSocketHub(server);
        wss = ws.wss;
        console.log('WebSocket hub attached');

    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

start();

export default app;
