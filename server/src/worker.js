import { connectDB } from './config/db.js';
import { getRedisConnection } from './config/redis.js';
import { startEscalationWorker, stopEscalationWorker, reconcilePendingJobs } from './workers/escalationWorker.js';

const run = async () => {
  try {
    console.log('[Worker-Process] Starting MediSync dedicated background worker...');
    await connectDB();
    getRedisConnection();

    const worker = startEscalationWorker();
    await reconcilePendingJobs();

    const shutdown = async (signal) => {
      console.log(`\n[Worker-Process] Received ${signal}. Shutting down worker cleanly...`);
      await stopEscalationWorker();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('[Worker-Process] Fatal error starting worker:', error);
    process.exit(1);
  }
};

run();
