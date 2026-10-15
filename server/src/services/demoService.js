import { DoseRecord } from '../models/DoseRecord.js';
import { Medicine } from '../models/Medicine.js';
import { MedicationSchedule } from '../models/MedicationSchedule.js';
import { CareContact } from '../models/CareContact.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { User } from '../models/User.js';
import { scheduleDoseEscalationJobs, inspectQueueJobs } from './queueService.js';
import { processEscalationStage } from './escalationService.js';
import { config } from '../config/env.js';
import crypto from 'crypto';

/**
 * Seed comprehensive demo scenario data for a user
 */
export const seedDemoScenario = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // 1. Create or ensure sample care contacts
  let caregiver = await CareContact.findOne({ userId, email: 'caregiver.demo@medisync.local' });
  if (!caregiver) {
    caregiver = await CareContact.create({
      userId,
      name: 'Sarah Chen (Caregiver)',
      email: 'caregiver.demo@medisync.local',
      phone: '+1 (555) 234-5678',
      relationship: 'Spouse & Primary Caregiver',
      role: 'caregiver',
      escalationLevel: 3,
      verificationStatus: 'verified',
      isActive: true,
    });
  }

  let doctor = await CareContact.findOne({ userId, email: 'dr.watson.demo@medisync.local' });
  if (!doctor) {
    doctor = await CareContact.create({
      userId,
      name: 'Dr. Emily Watson, MD',
      email: 'dr.watson.demo@medisync.local',
      phone: '+1 (555) 890-1234',
      relationship: 'Primary Care Physician',
      role: 'healthcare_professional',
      escalationLevel: 4,
      verificationStatus: 'verified',
      isActive: true,
    });
  }

  // 2. Create sample medicines
  let lisinopril = await Medicine.findOne({ userId, name: 'Lisinopril' });
  if (!lisinopril) {
    lisinopril = await Medicine.create({
      userId,
      name: 'Lisinopril',
      dosage: '10mg once daily',
      instructions: 'Take in the morning with a full glass of water. Do not skip breakfast.',
      purpose: 'Blood Pressure Management',
      startDate: new Date(),
      isActive: true,
    });
  }

  let metformin = await Medicine.findOne({ userId, name: 'Metformin' });
  if (!metformin) {
    metformin = await Medicine.create({
      userId,
      name: 'Metformin',
      dosage: '500mg twice daily',
      instructions: 'Take with meals to avoid gastrointestinal irritation.',
      purpose: 'Blood Sugar Regulation',
      startDate: new Date(),
      isActive: true,
    });
  }

  // 3. Create schedules
  let schedLisinopril = await MedicationSchedule.findOne({ userId, medicineId: lisinopril._id });
  if (!schedLisinopril) {
    schedLisinopril = await MedicationSchedule.create({
      userId,
      medicineId: lisinopril._id,
      times: ['08:00'],
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startDate: new Date(),
      isActive: true,
      timezone: user.timezone || 'Asia/Kolkata',
    });
  }

  let schedMetformin = await MedicationSchedule.findOne({ userId, medicineId: metformin._id });
  if (!schedMetformin) {
    schedMetformin = await MedicationSchedule.create({
      userId,
      medicineId: metformin._id,
      times: ['09:00', '20:00'],
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startDate: new Date(),
      isActive: true,
      timezone: user.timezone || 'Asia/Kolkata',
    });
  }

  // Record audit
  await AuditEvent.create({
    userId,
    action: 'DEMO_SCENARIO_SEEDED',
    entityType: 'User',
    entityId: userId,
    details: { seededContacts: 2, seededMedicines: 2 },
  });

  return {
    caregiver,
    doctor,
    medicines: [lisinopril, metformin],
    schedules: [schedLisinopril, schedMetformin],
  };
};

/**
 * Create a live accelerated test dose specifically for demoing escalation
 */
export const createDemoDose = async (userId, customMedicineName = '') => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  let medicine;
  if (customMedicineName) {
    medicine = await Medicine.findOne({ userId, name: customMedicineName });
  }
  if (!medicine) {
    medicine = await Medicine.findOne({ userId, isActive: true, isArchived: false });
  }
  if (!medicine) {
    // Automatically create a sample medicine
    medicine = await Medicine.create({
      userId,
      name: 'Demo Metformin (Accelerated Test)',
      dosage: '500mg',
      instructions: 'Demonstration test dose with accelerated timeline',
      purpose: 'Live Escalation Demonstration',
      startDate: new Date(),
      isActive: true,
    });
  }

  const now = new Date();
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: user.timezone || 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const timeString = timeFormatter.format(now);

  const testDose = await DoseRecord.create({
    userId,
    medicineId: medicine._id,
    scheduledTime: now, // Due right now
    timeString,
    status: 'DUE',
    isDemo: true,
    notes: 'Interactive demonstration dose (Accelerated timeline)',
  });

  // Schedule accelerated jobs in BullMQ (30s, 60s, 120s)
  const scheduledJobs = await scheduleDoseEscalationJobs(testDose, user, true);

  // Immediately process Stage 1 reminder so the reminder is dispatched instantly
  await processEscalationStage(testDose._id, 1, true);

  await AuditEvent.create({
    userId,
    action: 'DEMO_DOSE_CREATED',
    entityType: 'DoseRecord',
    entityId: testDose._id,
    details: { scheduledJobsCount: scheduledJobs.length },
  });

  return { dose: testDose, medicine, scheduledJobs };
};

/**
 * Manually advance a demo dose to the next escalation stage immediately (presentation jump)
 */
export const advanceDemoStage = async (doseId, targetStage) => {
  const dose = await DoseRecord.findById(doseId);
  if (!dose) throw new Error('Dose not found');

  const stageToRun = targetStage || (dose.escalationStage + 1);
  if (stageToRun > 4) {
    throw new Error('All 4 escalation stages have already been completed for this dose');
  }

  const result = await processEscalationStage(doseId, stageToRun, true, `manual_demo_stage_${stageToRun}`);
  const updatedDose = await DoseRecord.findById(doseId).populate('medicineId');

  return { result, dose: updatedDose };
};

/**
 * Safely reset all demo data for a user
 */
export const resetDemoData = async (userId) => {
  // Find all demo doses
  const demoDoses = await DoseRecord.find({ userId, isDemo: true });
  const demoDoseIds = demoDoses.map((d) => d._id);

  // Delete notification logs related to demo doses
  await NotificationLog.deleteMany({ doseRecordId: { $in: demoDoseIds } });
  
  // Delete demo doses
  const deletedCount = await DoseRecord.deleteMany({ userId, isDemo: true });

  await AuditEvent.create({
    userId,
    action: 'DEMO_DATA_RESET',
    entityType: 'User',
    entityId: userId,
    details: { removedDemoDoses: deletedCount.deletedCount },
  });

  return { count: deletedCount.deletedCount };
};

/**
 * Get current demo state, active demo doses, recent notifications, and queue status
 */
export const getDemoStatus = async (userId) => {
  const [demoDoses, recentLogs, queueStatus] = await Promise.all([
    DoseRecord.find({ userId, isDemo: true })
      .populate('medicineId')
      .sort({ createdAt: -1 })
      .limit(10),
    NotificationLog.find({ userId })
      .populate('doseRecordId')
      .sort({ createdAt: -1 })
      .limit(15),
    inspectQueueJobs(),
  ]);

  return {
    demoDoses,
    recentLogs,
    queueStatus,
  };
};

/**
 * Automatically ensure the default demo account exists so demo logins always succeed
 */
export const ensureDefaultDemoUser = async () => {
  try {
    const demoEmail = 'demo.patient@medisync.local';
    let user = await User.findOne({ email: demoEmail });
    if (!user) {
      console.log('[Demo] Seeding default demo patient account on startup...');
      user = await User.create({
        name: 'Demo Patient',
        email: demoEmail,
        password: 'DemoPassword123!',
        timezone: config.defaultTimezone,
        notificationPreferences: {
          email: true,
          includeMedicineName: true,
          gracePeriodMinutes: 30,
          caregiverGraceMinutes: 60,
          healthcareGraceMinutes: 120,
          enableHealthcareEscalation: true,
        },
      });
      await seedDemoScenario(user._id);
      console.log('[Demo] Default demo patient account seeded successfully.');
    }
    return user;
  } catch (err) {
    console.warn('[Demo] Note: Could not auto-seed demo user:', err.message);
  }
};

