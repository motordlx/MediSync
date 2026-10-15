import { DoseRecord } from '../models/DoseRecord.js';
import { Medicine } from '../models/Medicine.js';
import { confirmDose, syncDoseStatuses, generateDosesForUser } from '../services/doseService.js';

export const getTodayDoses = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const tz = req.user.timezone || 'Asia/Kolkata';

    await syncDoseStatuses(userId);

    // Compute start and end of today in user's timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayStr = formatter.format(now);

    const startOfTodayUtc = new Date(`${todayStr}T00:00:00Z`);
    // Adjust buffer to capture the full day in any local timezone (-14h to +14h)
    const windowStart = new Date(startOfTodayUtc.getTime() - 14 * 60 * 60 * 1000);
    const windowEnd = new Date(startOfTodayUtc.getTime() + 38 * 60 * 60 * 1000);

    const doses = await DoseRecord.find({
      userId,
      scheduledTime: { $gte: windowStart, $lte: windowEnd },
    })
      .populate('medicineId')
      .sort({ scheduledTime: 1 });

    // Filter precisely by matching local date string
    const todayDoses = doses.filter((d) => {
      const dStr = formatter.format(new Date(d.scheduledTime));
      return dStr === todayStr;
    });

    res.status(200).json({
      success: true,
      doses: todayDoses,
      date: todayStr,
    });
  } catch (error) {
    next(error);
  }
};

export const getUpcomingDoses = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit, 10) || 5;

    await syncDoseStatuses(userId);

    const upcoming = await DoseRecord.find({
      userId,
      status: { $in: ['UPCOMING', 'DUE', 'UNCONFIRMED'] },
      scheduledTime: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    })
      .populate('medicineId')
      .sort({ scheduledTime: 1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      upcoming,
    });
  } catch (error) {
    next(error);
  }
};

export const handleConfirmDose = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const result = await confirmDose(id, req.user._id, notes);

    res.status(200).json({
      success: true,
      dose: result.dose,
      isLate: result.isLate,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const getDoseHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { medicineId, status, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = { userId };

    if (medicineId) {
      query.medicineId = medicineId;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (startDate || endDate) {
      query.scheduledTime = {};
      if (startDate) query.scheduledTime.$gte = new Date(startDate);
      if (endDate) query.scheduledTime.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [doses, totalCount] = await Promise.all([
      DoseRecord.find(query)
        .populate('medicineId')
        .sort({ scheduledTime: -1 })
        .skip(skip)
        .limit(limitNum),
      DoseRecord.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      doses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdherenceStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const pastDays = parseInt(req.query.days, 10) || 7;
    const threshold = new Date(Date.now() - pastDays * 24 * 60 * 60 * 1000);

    const pastDoses = await DoseRecord.find({
      userId,
      scheduledTime: { $gte: threshold, $lte: new Date() },
      status: { $ne: 'CANCELLED' },
    });

    const total = pastDoses.length;
    const confirmedCount = pastDoses.filter((d) => d.status === 'TAKEN').length;
    const unconfirmedCount = pastDoses.filter((d) => d.status === 'UNCONFIRMED' || d.status === 'DUE').length;

    const adherenceRate = total > 0 ? Math.round((confirmedCount / total) * 100) : 100;

    res.status(200).json({
      success: true,
      stats: {
        periodDays: pastDays,
        totalScheduled: total,
        confirmedCount,
        unconfirmedCount,
        adherenceRate,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const triggerGenerateDoses = async (req, res, next) => {
  try {
    const created = await generateDosesForUser(req.user._id, 3);
    res.status(200).json({
      success: true,
      generatedCount: created.length,
      message: `Generated ${created.length} upcoming doses.`,
    });
  } catch (error) {
    next(error);
  }
};
