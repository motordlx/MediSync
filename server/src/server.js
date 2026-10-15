import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { getRedisConnection, closeRedisConnection } from './config/redis.js';
import { startEscalationWorker, stopEscalationWorker, reconcilePendingJobs } from './workers/escalationWorker.js';
import { ensureDefaultDemoUser } from './services/demoService.js';
import { config } from './config/env.js';

const startServer = async () => {
  try {
    // 1. Connect to Database (auto-fallbacks to in-memory MongoDB if local daemon is not running)
    await connectDB();

    // 2. Ensure default demo credentials account exists
    await ensureDefaultDemoUser();

    // 3. Initialize Redis connection
    getRedisConnection();

    // 3. Start BullMQ background worker inside the server instance (enables standalone single-process running as well)
    startEscalationWorker();

    // 4. Run startup job reconciliation
    await reconcilePendingJobs();

    // 5. Start Express HTTP listener
    const server = app.listen(config.port, () => {
      console.log(`\n======================================================`);
      console.log(`🏥 MediSync API Server is running on port ${config.port}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`⏱️ Default Timezone: ${config.defaultTimezone}`);
      console.log(`⚡ Demo Mode: ${config.demoMode.enabled ? 'ACTIVE' : 'INACTIVE'}`);
      console.log(`======================================================\n`);
    });

    const gracefulShutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Gracefully stopping HTTP server...`);
      server.close(async () => {
        console.log('[Server] HTTP listener closed.');
        await stopEscalationWorker();
        await closeRedisConnection();
        await disconnectDB();
        console.log('[Server] Shutdown complete.');
        process.exit(0);
      });

      // Force exit after 10s if hanging
      setTimeout(() => {
        console.error('[Server] Forcing shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    console.error('[Server] Critical startup error:', error);
    process.exit(1);
  }
};

startServer();
