import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './env.js';

let mongodInstance = null;
let isHostProcess = false;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '../..');
const uriFile = path.resolve(serverRoot, 'data/active-mongo-uri.txt');

export const connectDB = async () => {
  // 1. Try connecting to the configured URI (e.g. mongodb://localhost:27017/medisync)
  try {
    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 8000,
    });
    const sanitizedUri = config.mongodbUri.replace(/:([^:@]+)@/, ':****@');
    console.log(`[DB] Connected to MongoDB at ${sanitizedUri}`);
    return;
  } catch (err) {
    if (config.nodeEnv === 'production') {
      console.error('[DB] Production MongoDB connection failed:', err.message);
      throw err;
    }
  }

  // 2. In dev/test: Check if another process (e.g. server) already launched the embedded DB
  if (fs.existsSync(uriFile)) {
    try {
      const activeUri = fs.readFileSync(uriFile, 'utf-8').trim();
      if (activeUri) {
        await mongoose.connect(activeUri, { serverSelectionTimeoutMS: 1500 });
        console.log(`[DB] Connected to active shared MongoDB instance at ${activeUri}`);
        return;
      }
    } catch {
      // Stale file or unreachable, will launch fresh
    }
  }

  // 3. Fallback: launch embedded MongoDB instance with persistent storage
  console.log('[DB] Launching embedded MongoDB instance with disk persistence...');
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const dbDir = path.resolve(serverRoot, 'data/embedded-db');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    mongodInstance = await MongoMemoryServer.create({
      instance: {
        dbPath: dbDir,
        storageEngine: 'wiredTiger',
      },
    });

    const memUri = mongodInstance.getUri();
    isHostProcess = true;

    // Save URI for sibling processes (e.g. background worker)
    const dataDir = path.dirname(uriFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(uriFile, memUri, 'utf-8');

    await mongoose.connect(memUri);
    console.log(`[DB] Successfully connected to persistent embedded MongoDB instance at ${memUri}`);
  } catch (memErr) {
    console.error('[DB] Failed to launch embedded MongoDB:', memErr.message);
    throw memErr;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
      mongodInstance = null;
    }
    if (isHostProcess && fs.existsSync(uriFile)) {
      try {
        fs.unlinkSync(uriFile);
      } catch { }
    }
    console.log('[DB] Disconnected from MongoDB');
  } catch (err) {
    console.error('[DB] Error during disconnect:', err.message);
  }
};