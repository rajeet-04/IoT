import mongoose from 'mongoose';

let _connection = null;

/**
 * Connect to MongoDB using Mongoose.
 * Caches the connection for reuse across requests.
 * @param {string} uri - MongoDB connection string
 * @returns {Promise<typeof mongoose>} Mongoose instance
 */
export async function connectDB(uri) {
  if (_connection) {
    return _connection;
  }

  _connection = await mongoose.connect(uri, {
    serverApi: { version: '1' },
  });

  console.log('MongoDB connected');

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });

  return _connection;
}

/**
 * Get the cached MongoDB connection.
 * @returns {typeof mongoose} Mongoose instance
 * @throws {Error} If connectDB() has not been called first
 */
export function getDB() {
  if (!_connection) {
    throw new Error('Database not connected — call connectDB() first');
  }
  return _connection;
}
