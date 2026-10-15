import { DoseRecord } from '../models/DoseRecord.js';
import { MedicationSchedule } from '../models/MedicationSchedule.js';
import { Medicine } from '../models/Medicine.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { scheduleDoseEscalationJobs, cancelFutureDoseJobs } from './queueService.js';
import { User } from '../models/User.js';

/**
 * Generate dose records for a single schedule across a date range (default today + next N days)
 */
export const generateDosesForSchedule = async (schedule, daysAhead = 1, queueJobs = true) => {
  if (!schedule.isActive) return [];

  const medicine = await Medicine.findById(schedule.medicineId);
  if (!medicine || !medicine.isActive || medicine.isArchived) return [];

  const user = await User.findById(schedule.userId);
  if (!user) return [];

  const timezone = schedule.timezone || user.timezone || 'Asia/Kolkata';
  const createdDoses = [];

  const now = new Date();

  // Iterate from today to daysAhead
  for (let offset = 0; offset <= daysAhead; offset++) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + offset);

    // Format target date YYYY-MM-DD in the target timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const dateStr = formatter.format(targetDate); // e.g. "2026-10-14"

    // Check day of week (0 = Sunday ... 6 = Saturday) in target timezone
    const dayOfWeekFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'narrow',
    });
    // Or compute day of week accurately
    const targetDayIndex = new Date(`${dateStr}T12:00:00Z`).getUTCDay();

    if (!schedule.daysOfWeek.includes(targetDayIndex)) {
      continue;
    }

    // For each time in the schedule
    for (const timeStr of schedule.times) {
      const [hours, minutes] = timeStr.split(':');

      // Create full ISO string with timezone or parse correctly
      // We can construct the ISO string and get exact UTC time
      const testIso = `${dateStr}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
      
      // Calculate UTC timestamp for this local date & time
      // Using Intl to find the exact offset difference
      const scheduledUtc = parseLocalDateInTimezone(dateStr, timeStr, timezone);

      // Check if within schedule startDate and endDate (comparing normalized day boundaries)
      const schedStartDay = schedule.startDate ? new Date(new Date(schedule.startDate).setHours(0, 0, 0, 0)) : null;
      const schedEndDay = schedule.endDate ? new Date(new Date(schedule.endDate).setHours(23, 59, 59, 999)) : null;
      if (schedStartDay && scheduledUtc < schedStartDay) continue;
      if (schedEndDay && scheduledUtc > schedEndDay) continue;
      if (medicine.endDate && scheduledUtc > new Date(medicine.endDate)) continue;

      // Determine initial status based on current time
      let initialStatus = 'UPCOMING';
      if (scheduledUtc <= now) {
        initialStatus = 'DUE';
      }

      try {
        const existingDose = await DoseRecord.findOne({
          scheduleId: schedule._id,
          scheduledTime: scheduledUtc,
        });

        if (!existingDose) {
          const newDose = await DoseRecord.create({
            userId: schedule.userId,
            medicineId: schedule.medicineId,
            scheduleId: schedule._id,
            scheduledTime: scheduledUtc,
            timeString: timeStr,
            status: initialStatus,
            isDemo: false,
          });

          createdDoses.push(newDose);

          if (queueJobs && initialStatus === 'UPCOMING') {
            await scheduleDoseEscalationJobs(newDose, user, false);
          }
        }
      } catch (err) {
        // Ignore duplicate key race conditions safely
        if (err.code !== 11000) {
          console.error('[DoseService] Error creating dose:', err.message);
        }
      }
    }
  }

  return createdDoses;
};

/**
 * Generate doses for all active schedules for a user
 */
export const generateDosesForUser = async (userId, daysAhead = 2) => {
  const schedules = await MedicationSchedule.find({ userId, isActive: true });
  const allCreated = [];
  for (const schedule of schedules) {
    const created = await generateDosesForSchedule(schedule, daysAhead, true);
    allCreated.push(...created);
  }
  return allCreated;
};

/**
 * Confirm a dose as taken.
 * Supports on-time and late confirmations.
 * Stops future escalations while preserving past notification history.
 */
export const confirmDose = async (doseId, userId, notes = '') => {
  const dose = await DoseRecord.findOne({ _id: doseId, userId });
  if (!dose) {
    throw new Error('Dose record not found or unauthorized');
  }

  if (dose.status === 'TAKEN') {
    return { dose, message: 'Dose was already confirmed as taken' };
  }

  const previousStatus = dose.status;
  const now = new Date();
  const isLate = dose.escalationStage > 0 || now.getTime() > new Date(dose.scheduledTime).getTime() + 15 * 60 * 1000;

  dose.status = 'TAKEN';
  dose.confirmationTimestamp = now;
  dose.confirmedBy = userId;
  if (notes) dose.notes = notes;

  await dose.save();

  // Cancel any pending future escalation jobs for this dose
  await cancelFutureDoseJobs(dose._id.toString());

  // Log clinical audit event
  await AuditEvent.create({
    userId,
    action: isLate ? 'LATE_CONFIRMATION' : 'DOSE_CONFIRMED',
    entityType: 'DoseRecord',
    entityId: dose._id,
    details: {
      scheduledTime: dose.scheduledTime,
      confirmedAt: now,
      previousStatus,
      escalationStageReached: dose.escalationStage,
      notificationsSentCount: dose.escalationHistory.length,
      notes,
    },
  });

  return { dose, isLate, message: 'Dose successfully confirmed as taken' };
};

/**
 * Refresh and sync statuses for today's doses (e.g. UPCOMING -> DUE)
 */
export const syncDoseStatuses = async (userId) => {
  const now = new Date();
  // Any UPCOMING doses where scheduledTime <= now should become DUE
  await DoseRecord.updateMany(
    {
      userId,
      status: 'UPCOMING',
      scheduledTime: { $lte: now },
    },
    {
      $set: { status: 'DUE' },
    }
  );
};

/**
 * Helper to convert local date string (YYYY-MM-DD) and time string (HH:mm) in a timezone to a UTC Date object
 */
export const parseLocalDateInTimezone = (dateStr, timeStr, timezone) => {
  // Construct rough UTC date
  const isoCandidate = `${dateStr}T${timeStr}:00.000Z`;
  const dateObj = new Date(isoCandidate);

  // Determine timezone offset in minutes at that instant
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  });

  const parts = dtf.formatToParts(dateObj);
  const partMap = {};
  parts.forEach((p) => { partMap[p.type] = p.value; });

  const formattedAsLocal = new Date(
    Date.UTC(
      parseInt(partMap.year, 10),
      parseInt(partMap.month, 10) - 1,
      parseInt(partMap.day, 10),
      parseInt(partMap.hour, 10),
      parseInt(partMap.minute, 10),
      parseInt(partMap.second, 10)
    )
  );

  const diffMs = dateObj.getTime() - formattedAsLocal.getTime();
  return new Date(dateObj.getTime() + diffMs);
};
