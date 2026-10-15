import { MedicationSchedule } from '../models/MedicationSchedule.js';
import { Medicine } from '../models/Medicine.js';
import { DoseRecord } from '../models/DoseRecord.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { generateDosesForSchedule } from '../services/doseService.js';

export const getSchedules = async (req, res, next) => {
  try {
    const schedules = await MedicationSchedule.find({ userId: req.user._id })
      .populate('medicineId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      schedules,
    });
  } catch (error) {
    next(error);
  }
};

export const createSchedule = async (req, res, next) => {
  try {
    const { medicineId, times, daysOfWeek, startDate, endDate, timezone } = req.body;

    if (!medicineId || !times || !Array.isArray(times) || times.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Medicine ID and at least one scheduled time (HH:mm) are required.',
      });
    }

    // Verify medicine belongs to user
    const medicine = await Medicine.findOne({ _id: medicineId, userId: req.user._id, isArchived: false });
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found or access denied.',
      });
    }

    const schedule = await MedicationSchedule.create({
      userId: req.user._id,
      medicineId,
      times,
      daysOfWeek: daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
      startDate: startDate || new Date(),
      endDate: endDate || null,
      timezone: timezone || req.user.timezone || 'Asia/Kolkata',
      isActive: true,
    });

    // Automatically generate dose records for the next 3 days
    const createdDoses = await generateDosesForSchedule(schedule, 3, true);

    await AuditEvent.create({
      userId: req.user._id,
      action: 'SCHEDULE_CREATED',
      entityType: 'MedicationSchedule',
      entityId: schedule._id,
      details: { medicineName: medicine.name, times, generatedDosesCount: createdDoses.length },
    });

    res.status(201).json({
      success: true,
      schedule,
      generatedDosesCount: createdDoses.length,
      message: 'Medication schedule configured successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const updateSchedule = async (req, res, next) => {
  try {
    const { times, daysOfWeek, startDate, endDate, isActive, timezone } = req.body;

    const schedule = await MedicationSchedule.findOne({ _id: req.params.id, userId: req.user._id });
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found or access denied.',
      });
    }

    if (times) schedule.times = times;
    if (daysOfWeek) schedule.daysOfWeek = daysOfWeek;
    if (startDate) schedule.startDate = startDate;
    if (endDate !== undefined) schedule.endDate = endDate;
    if (isActive !== undefined) schedule.isActive = isActive;
    if (timezone) schedule.timezone = timezone;

    await schedule.save();

    // Re-generate fresh doses for updated schedule
    if (schedule.isActive) {
      await generateDosesForSchedule(schedule, 3, true);
    }

    await AuditEvent.create({
      userId: req.user._id,
      action: 'SCHEDULE_UPDATED',
      entityType: 'MedicationSchedule',
      entityId: schedule._id,
      details: { times: schedule.times, isActive: schedule.isActive },
    });

    res.status(200).json({
      success: true,
      schedule,
      message: 'Schedule updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const toggleSchedule = async (req, res, next) => {
  try {
    const schedule = await MedicationSchedule.findOne({ _id: req.params.id, userId: req.user._id });
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found or access denied.',
      });
    }

    schedule.isActive = !schedule.isActive;
    await schedule.save();

    if (!schedule.isActive) {
      // Cancel pending upcoming doses for this schedule
      await DoseRecord.updateMany(
        { scheduleId: schedule._id, status: 'UPCOMING' },
        { $set: { status: 'CANCELLED' } }
      );
    } else {
      await generateDosesForSchedule(schedule, 3, true);
    }

    res.status(200).json({
      success: true,
      schedule,
      message: `Schedule ${schedule.isActive ? 'activated' : 'paused'}.`,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSchedule = async (req, res, next) => {
  try {
    const schedule = await MedicationSchedule.findOne({ _id: req.params.id, userId: req.user._id });
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found or access denied.',
      });
    }

    // Cancel future upcoming doses
    await DoseRecord.updateMany(
      { scheduleId: schedule._id, status: 'UPCOMING' },
      { $set: { status: 'CANCELLED' } }
    );

    await MedicationSchedule.deleteOne({ _id: schedule._id });

    res.status(200).json({
      success: true,
      message: 'Schedule deleted and future doses cancelled.',
    });
  } catch (error) {
    next(error);
  }
};
