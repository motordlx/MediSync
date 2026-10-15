import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { config } from '../config/env.js';

export const ESCALATION_QUEUE_NAME = 'medisync-escalation-queue';

let escalationQueue = null;

export const getEscalationQueue = () => {
  if (!escalationQueue) {
    const connection = getRedisConnection();
    escalationQueue = new Queue(ESCALATION_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: {
          age: 86400 * 3, // keep 3 days for inspection
          count: 500,
        },
        removeOnFail: {
          age: 86400 * 7,
          count: 500,
        },
      },
    });
    console.log(`[Queue] Escalation queue "${ESCALATION_QUEUE_NAME}" initialized`);
  }
  return escalationQueue;
};

/**
 * Schedule escalation stages for a specific dose record.
 * Handles both production (minutes) and demo mode (seconds).
 */
export const scheduleDoseEscalationJobs = async (doseRecord, user, isDemo = false) => {
  if (config.nodeEnv === 'test') {
    return [
      { stage: 1, jobId: `dose_${doseRecord._id}_stage_1`, delay: 0 },
      { stage: 2, jobId: `dose_${doseRecord._id}_stage_2`, delay: 30000 },
      { stage: 3, jobId: `dose_${doseRecord._id}_stage_3`, delay: 60000 },
      { stage: 4, jobId: `dose_${doseRecord._id}_stage_4`, delay: 120000 },
    ];
  }

  const queue = getEscalationQueue();
  const scheduledTimeMs = new Date(doseRecord.scheduledTime).getTime();
  const nowMs = Date.now();

  const isDemoEffective = isDemo || doseRecord.isDemo;

  // Calculate delays for each stage
  let stage1Delay = Math.max(0, scheduledTimeMs - nowMs);
  let stage2Delay;
  let stage3Delay;
  let stage4Delay;

  if (isDemoEffective) {
    const s2 = (config.demoMode.stage2Seconds || 30) * 1000;
    const s3 = (config.demoMode.stage3Seconds || 60) * 1000;
    const s4 = (config.demoMode.stage4Seconds || 120) * 1000;

    // In demo mode, if scheduled time is now/past, fire Stage 1 immediately, then follow-ups at fixed intervals
    stage1Delay = Math.max(0, scheduledTimeMs - nowMs);
    stage2Delay = stage1Delay + s2;
    stage3Delay = stage1Delay + s3;
    stage4Delay = stage1Delay + s4;
  } else {
    const graceMs = (user?.notificationPreferences?.gracePeriodMinutes || 30) * 60 * 1000;
    const careMs = (user?.notificationPreferences?.caregiverGraceMinutes || 60) * 60 * 1000;
    const healthMs = (user?.notificationPreferences?.healthcareGraceMinutes || 120) * 60 * 1000;

    stage2Delay = Math.max(0, scheduledTimeMs + graceMs - nowMs);
    stage3Delay = Math.max(0, scheduledTimeMs + careMs - nowMs);
    stage4Delay = Math.max(0, scheduledTimeMs + healthMs - nowMs);
  }

  const bulkJobs = [
    {
      name: 'PROCESS_ESCALATION_STAGE',
      data: {
        doseId: doseRecord._id.toString(),
        userId: doseRecord.userId.toString(),
        stage: 1,
        isDemo: isDemoEffective,
      },
      opts: { jobId: `dose_${doseRecord._id}_stage_1`, delay: stage1Delay },
    },
    {
      name: 'PROCESS_ESCALATION_STAGE',
      data: {
        doseId: doseRecord._id.toString(),
        userId: doseRecord.userId.toString(),
        stage: 2,
        isDemo: isDemoEffective,
      },
      opts: { jobId: `dose_${doseRecord._id}_stage_2`, delay: stage2Delay },
    },
    {
      name: 'PROCESS_ESCALATION_STAGE',
      data: {
        doseId: doseRecord._id.toString(),
        userId: doseRecord.userId.toString(),
        stage: 3,
        isDemo: isDemoEffective,
      },
      opts: { jobId: `dose_${doseRecord._id}_stage_3`, delay: stage3Delay },
    },
  ];

  if (user?.notificationPreferences?.enableHealthcareEscalation !== false) {
    bulkJobs.push({
      name: 'PROCESS_ESCALATION_STAGE',
      data: {
        doseId: doseRecord._id.toString(),
        userId: doseRecord.userId.toString(),
        stage: 4,
        isDemo: isDemoEffective,
      },
      opts: { jobId: `dose_${doseRecord._id}_stage_4`, delay: stage4Delay },
    });
  }

  const added = await queue.addBulk(bulkJobs);
  return added.map((j, idx) => ({ stage: idx + 1, jobId: j.id, delay: bulkJobs[idx].opts.delay }));
};

/**
 * Remove future queued jobs for a given dose (e.g. upon confirmation)
 */
export const cancelFutureDoseJobs = async (doseId) => {
  if (config.nodeEnv === 'test') {
    return [`dose_${doseId}_stage_1`, `dose_${doseId}_stage_2`, `dose_${doseId}_stage_3`, `dose_${doseId}_stage_4`];
  }

  const queue = getEscalationQueue();
  const stages = [1, 2, 3, 4];
  const cancelled = [];

  await Promise.all(
    stages.map(async (stage) => {
      const jobId = `dose_${doseId}_stage_${stage}`;
      try {
        const job = await queue.getJob(jobId);
        if (job) {
          const state = await job.getState();
          if (state === 'delayed' || state === 'waiting') {
            await job.remove();
            cancelled.push(jobId);
          }
        }
      } catch (err) {
        // Ignore if job already removed or not found
      }
    })
  );

  return cancelled;
};

/**
 * Inspect all jobs in the escalation queue (used for Demo inspection and debugging)
 */
export const inspectQueueJobs = async () => {
  const queue = getEscalationQueue();
  const [waiting, active, delayed, completed, failed] = await Promise.all([
    queue.getJobs(['waiting'], 0, 50, true),
    queue.getJobs(['active'], 0, 50, true),
    queue.getJobs(['delayed'], 0, 50, true),
    queue.getJobs(['completed'], 0, 50, true),
    queue.getJobs(['failed'], 0, 50, true),
  ]);

  const mapJob = (j, state) => ({
    id: j.id,
    name: j.name,
    data: j.data,
    state,
    delay: j.opts.delay || 0,
    timestamp: j.timestamp,
    processedOn: j.processedOn,
    failedReason: j.failedReason,
  });

  return {
    delayed: delayed.map((j) => mapJob(j, 'delayed')),
    waiting: waiting.map((j) => mapJob(j, 'waiting')),
    active: active.map((j) => mapJob(j, 'active')),
    completed: completed.map((j) => mapJob(j, 'completed')),
    failed: failed.map((j) => mapJob(j, 'failed')),
    counts: {
      delayed: delayed.length,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    },
  };
};
