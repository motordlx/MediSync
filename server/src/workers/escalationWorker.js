import { Worker } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { ESCALATION_QUEUE_NAME, scheduleDoseEscalationJobs } from '../services/queueService.js';
import { processEscalationStage } from '../services/escalationService.js';
import { DoseRecord } from '../models/DoseRecord.js';
import { User } from '../models/User.js';

let worker = null;

export const startEscalationWorker = () => {
  if (worker) return worker;

  const connection = getRedisConnection();

  worker = new Worker(
    ESCALATION_QUEUE_NAME,
    async (job) => {
      console.log(`[Worker] Starting job ${job.id} (${job.name})`);
      const { doseId, stage, isDemo } = job.data;

      if (job.name === 'PROCESS_ESCALATION_STAGE') {
        const result = await processEscalationStage(doseId, stage, isDemo, job.id);
        return result;
      }

      console.warn(`[Worker] Unrecognized job name: ${job.name}`);
      return { skipped: true, unknownJob: true };
    },
    {
      connection,
      concurrency: 5,
      limiter: {
        max: 100,
        duration: 1000,
      },
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`[Worker] Job ${job.id} completed. Result:`, result?.reason || (result?.success ? 'SUCCESS' : 'DONE'));
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[Worker] Worker encountered error:', err.message);
  });

  console.log('[Worker] Escalation background worker initialized and listening for jobs.');
  return worker;
};

export const stopEscalationWorker = async () => {
  if (worker) {
    console.log('[Worker] Gracefully shutting down worker...');
    await worker.close();
    worker = null;
    console.log('[Worker] Worker shut down complete.');
  }
};

/**
 * Reconcile pending jobs after a server or worker restart.
 * Finds any UPCOMING or DUE unconfirmed doses from the last 24h into the next 48h
 * and ensures BullMQ jobs are scheduled for them.
 */
export const reconcilePendingJobs = async () => {
  try {
    const now = new Date();
    const pastThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const futureThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const pendingDoses = await DoseRecord.find({
      status: { $in: ['UPCOMING', 'DUE', 'UNCONFIRMED'] },
      scheduledTime: { $gte: pastThreshold, $lte: futureThreshold },
      isDemo: false,
    });

    console.log(`[Reconciliation] Checking ${pendingDoses.length} pending doses for job recovery...`);

    let scheduledCount = 0;
    for (const dose of pendingDoses) {
      const user = await User.findById(dose.userId);
      if (user) {
        await scheduleDoseEscalationJobs(dose, user, false);
        scheduledCount++;
      }
    }

    console.log(`[Reconciliation] Successfully verified/re-scheduled jobs for ${scheduledCount} doses.`);
  } catch (err) {
    console.error('[Reconciliation] Error reconciling pending jobs:', err.message);
  }
};
