import { DoseRecord } from '../models/DoseRecord.js';
import { Medicine } from '../models/Medicine.js';
import { CareContact } from '../models/CareContact.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { syncDoseStatuses } from '../services/doseService.js';

export const getDashboardSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const tz = req.user.timezone || 'Asia/Kolkata';

    await syncDoseStatuses(userId);

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayStr = formatter.format(now);

    const startOfTodayUtc = new Date(`${todayStr}T00:00:00Z`);
    const windowStart = new Date(startOfTodayUtc.getTime() - 14 * 60 * 60 * 1000);
    const windowEnd = new Date(startOfTodayUtc.getTime() + 38 * 60 * 60 * 1000);

    // Fetch all records concurrently for maximum performance
    const [allWindowDoses, activeMedicinesCount, careCircleCount, recentNotifications, recentAudits] = await Promise.all([
      DoseRecord.find({
        userId,
        scheduledTime: { $gte: windowStart, $lte: windowEnd },
      })
        .populate('medicineId')
        .sort({ scheduledTime: 1 }),
      Medicine.countDocuments({ userId, isActive: true, isArchived: false }),
      CareContact.countDocuments({ userId, isActive: true }),
      NotificationLog.find({ userId })
        .populate('doseRecordId')
        .sort({ createdAt: -1 })
        .limit(5),
      AuditEvent.find({ userId })
        .sort({ createdAt: -1 })
        .limit(8),
    ]);

    // Precise filter for today in user timezone
    const todayDoses = allWindowDoses.filter((d) => {
      const dStr = formatter.format(new Date(d.scheduledTime));
      return dStr === todayStr;
    });

    const totalScheduled = todayDoses.length;
    const confirmedTaken = todayDoses.filter((d) => d.status === 'TAKEN').length;
    const dueNow = todayDoses.filter((d) => d.status === 'DUE').length;
    const upcoming = todayDoses.filter((d) => d.status === 'UPCOMING').length;
    const unconfirmed = todayDoses.filter((d) => d.status === 'UNCONFIRMED').length;

    // Upcoming reminders (next scheduled doses)
    const nextReminders = await DoseRecord.find({
      userId,
      scheduledTime: { $gte: now },
      status: { $in: ['UPCOMING', 'DUE'] },
    })
      .populate('medicineId')
      .sort({ scheduledTime: 1 })
      .limit(4);

    // Calculate historical adherence over past 7 days
    const pastSevenDays = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const pastDoses = await DoseRecord.find({
      userId,
      scheduledTime: { $gte: pastSevenDays, $lte: now },
      status: { $ne: 'CANCELLED' },
    });

    const pastTotal = pastDoses.length;
    const pastConfirmed = pastDoses.filter((d) => d.status === 'TAKEN').length;
    const pastUnconfirmed = pastDoses.filter((d) => d.status === 'UNCONFIRMED' || d.status === 'DUE').length;
    const adherenceRate = pastTotal > 0 ? Math.round((pastConfirmed / pastTotal) * 100) : 100;

    res.status(200).json({
      success: true,
      today: {
        dateString: todayStr,
        totalScheduled,
        confirmedTaken,
        dueNow,
        upcoming,
        unconfirmed,
        timeline: todayDoses,
      },
      nextReminders,
      adherence: {
        rate: adherenceRate,
        pastTotal,
        pastConfirmed,
        pastUnconfirmed,
        evaluationPeriodDays: 7,
      },
      counts: {
        activeMedicines: activeMedicinesCount,
        careContacts: careCircleCount,
      },
      recentActivity: recentAudits,
      recentNotifications,
    });
  } catch (error) {
    next(error);
  }
};
