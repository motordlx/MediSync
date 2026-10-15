import { DoseRecord } from '../models/DoseRecord.js';
import { User } from '../models/User.js';
import { Medicine } from '../models/Medicine.js';
import { CareContact } from '../models/CareContact.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { AuditEvent } from '../models/AuditEvent.js';
import {
  sendDoseReminderEmail,
  sendDoseFollowupEmail,
  sendCaregiverAlertEmail,
  sendHealthcareAlertEmail,
} from './emailService.js';
import { config } from '../config/env.js';

/**
 * Execute a specific escalation stage for a dose record.
 * Must verify real-time DB state immediately before performing any action.
 */
export const processEscalationStage = async (doseId, stage, isDemo = false, jobId = '') => {
  console.log(`[Escalation] Processing Stage ${stage} for dose ${doseId} (isDemo=${isDemo})`);

  // 1. Fetch fresh dose record from database
  const dose = await DoseRecord.findById(doseId);
  if (!dose) {
    console.warn(`[Escalation] Dose ${doseId} no longer exists. Skipping.`);
    return { skipped: true, reason: 'DOSE_NOT_FOUND' };
  }

  // 2. Escalation Rule 1 & 2: Check latest dose status
  if (dose.status === 'TAKEN') {
    console.log(`[Escalation] Dose ${doseId} is already confirmed as TAKEN. Skipping Stage ${stage}.`);
    return { skipped: true, reason: 'ALREADY_TAKEN' };
  }

  if (dose.status === 'CANCELLED') {
    console.log(`[Escalation] Dose ${doseId} is CANCELLED. Skipping Stage ${stage}.`);
    return { skipped: true, reason: 'CANCELLED' };
  }

  // 3. Fetch patient details and medicine details
  const [user, medicine] = await Promise.all([
    User.findById(dose.userId),
    Medicine.findById(dose.medicineId),
  ]);

  if (!user) {
    console.warn(`[Escalation] Patient ${dose.userId} not found. Skipping.`);
    return { skipped: true, reason: 'PATIENT_NOT_FOUND' };
  }

  // Format scheduled time nicely in patient's timezone
  const tz = user.timezone || config.defaultTimezone;
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const scheduledTimeFormatted = timeFormatter.format(new Date(dose.scheduledTime));

  const includeMedName = user.notificationPreferences?.includeMedicineName !== false;
  const medicineName = medicine?.name || 'Prescribed Medicine';
  const instructions = medicine?.instructions || '';

  const results = [];

  // ==========================================
  // STAGE 1: Initial reminder to patient
  // ==========================================
  if (stage === 1) {
    const idempotencyKey = `dose_${dose._id}_stage_1`;
    const existingLog = await NotificationLog.findOne({ idempotencyKey });
    if (existingLog) {
      console.log(`[Escalation] Stage 1 already recorded for dose ${dose._id}. Duplicate prevented.`);
      return { skipped: true, reason: 'DUPLICATE_STAGE_1' };
    }

    if (dose.status === 'UPCOMING') {
      dose.status = 'DUE';
    }

    let deliveryOutcome = { status: 'SIMULATED' };
    if (user.notificationPreferences?.email !== false) {
      deliveryOutcome = await sendDoseReminderEmail({
        to: user.email,
        patientName: user.name,
        medicineName,
        scheduledTimeFormatted,
        instructions,
        includeMedicineName: includeMedName,
      });
    }

    const log = await NotificationLog.create({
      userId: user._id,
      doseRecordId: dose._id,
      stage: 1,
      recipientEmail: user.email,
      recipientRole: 'patient',
      recipientName: user.name,
      channel: 'email',
      status: deliveryOutcome.status || 'ATTEMPTED',
      subject: 'MediSync - Your medicine reminder',
      contentSnippet: `Dose reminder for ${scheduledTimeFormatted}`,
      idempotencyKey,
      jobId,
    });

    dose.escalationStage = Math.max(dose.escalationStage, 1);
    dose.lastNotifiedAt = new Date();
    dose.escalationHistory.push({
      stage: 1,
      sentAt: new Date(),
      recipientEmail: user.email,
      recipientRole: 'patient',
      status: deliveryOutcome.status || 'DELIVERED',
      jobId,
    });
    await dose.save();

    await AuditEvent.create({
      userId: user._id,
      action: 'ESCALATION_STAGE_1_REMINDER',
      entityType: 'DoseRecord',
      entityId: dose._id,
      details: { stage: 1, status: dose.status, deliveryStatus: deliveryOutcome.status },
    });

    return { success: true, stage: 1, log };
  }

  // ==========================================
  // STAGE 2: Follow-up reminder to patient
  // ==========================================
  if (stage === 2) {
    const idempotencyKey = `dose_${dose._id}_stage_2`;
    const existingLog = await NotificationLog.findOne({ idempotencyKey });
    if (existingLog) {
      console.log(`[Escalation] Stage 2 already recorded for dose ${dose._id}. Duplicate prevented.`);
      return { skipped: true, reason: 'DUPLICATE_STAGE_2' };
    }

    // Mark as unconfirmed
    dose.status = 'UNCONFIRMED';

    const graceMins = isDemo
      ? Math.round((config.demoMode.stage2Seconds || 30) / 60) || 1
      : (user.notificationPreferences?.gracePeriodMinutes || 30);

    let deliveryOutcome = { status: 'SIMULATED' };
    if (user.notificationPreferences?.email !== false) {
      deliveryOutcome = await sendDoseFollowupEmail({
        to: user.email,
        patientName: user.name,
        medicineName,
        scheduledTimeFormatted,
        gracePeriodMinutes: graceMins,
        includeMedicineName: includeMedName,
      });
    }

    const log = await NotificationLog.create({
      userId: user._id,
      doseRecordId: dose._id,
      stage: 2,
      recipientEmail: user.email,
      recipientRole: 'patient',
      recipientName: user.name,
      channel: 'email',
      status: deliveryOutcome.status || 'ATTEMPTED',
      subject: 'MediSync - Follow-up: Dose Awaiting Confirmation',
      contentSnippet: `Follow-up unconfirmed dose for ${scheduledTimeFormatted}`,
      idempotencyKey,
      jobId,
    });

    dose.escalationStage = Math.max(dose.escalationStage, 2);
    dose.lastNotifiedAt = new Date();
    dose.escalationHistory.push({
      stage: 2,
      sentAt: new Date(),
      recipientEmail: user.email,
      recipientRole: 'patient',
      status: deliveryOutcome.status || 'DELIVERED',
      jobId,
    });
    await dose.save();

    await AuditEvent.create({
      userId: user._id,
      action: 'ESCALATION_STAGE_2_FOLLOWUP',
      entityType: 'DoseRecord',
      entityId: dose._id,
      details: { stage: 2, status: dose.status, deliveryStatus: deliveryOutcome.status },
    });

    return { success: true, stage: 2, log };
  }

  // ==========================================
  // STAGE 3: Caregiver / Family Alert
  // ==========================================
  if (stage === 3) {
    // Query active verified caregivers / family members
    const contacts = await CareContact.find({
      userId: user._id,
      isActive: true,
      role: { $in: ['caregiver', 'family_member'] },
      verificationStatus: 'verified', // Escalation Rule 9: Must be verified!
    });

    if (contacts.length === 0) {
      console.log(`[Escalation] No verified caregivers found for patient ${user._id}.`);
      await AuditEvent.create({
        userId: user._id,
        action: 'ESCALATION_STAGE_3_SKIPPED_NO_CONTACTS',
        entityType: 'DoseRecord',
        entityId: dose._id,
        details: { reason: 'No verified caregivers registered in Care Circle' },
      });
      return { skipped: true, reason: 'NO_VERIFIED_CAREGIVERS' };
    }

    const elapsedMins = isDemo
      ? Math.round((config.demoMode.stage3Seconds || 60) / 60) || 1
      : (user.notificationPreferences?.caregiverGraceMinutes || 60);

    for (const contact of contacts) {
      const idempotencyKey = `dose_${dose._id}_stage_3_contact_${contact._id}`;
      const existing = await NotificationLog.findOne({ idempotencyKey });
      if (existing) continue;

      const deliveryOutcome = await sendCaregiverAlertEmail({
        to: contact.email,
        caregiverName: contact.name,
        patientName: user.name,
        medicineName,
        scheduledTimeFormatted,
        elapsedMinutes: elapsedMins,
        includeMedicineName: includeMedName,
      });

      const log = await NotificationLog.create({
        userId: user._id,
        doseRecordId: dose._id,
        stage: 3,
        recipientEmail: contact.email,
        recipientRole: contact.role,
        recipientName: contact.name,
        channel: 'email',
        status: deliveryOutcome.status || 'ATTEMPTED',
        subject: `MediSync - Notification regarding ${user.name}'s schedule`,
        contentSnippet: `Caregiver notification for unconfirmed dose of ${user.name}`,
        idempotencyKey,
        jobId,
      });

      dose.escalationHistory.push({
        stage: 3,
        sentAt: new Date(),
        recipientEmail: contact.email,
        recipientRole: contact.role,
        status: deliveryOutcome.status || 'DELIVERED',
        jobId,
      });

      results.push(log);
    }

    dose.escalationStage = Math.max(dose.escalationStage, 3);
    dose.lastNotifiedAt = new Date();
    await dose.save();

    await AuditEvent.create({
      userId: user._id,
      action: 'ESCALATION_STAGE_3_CAREGIVER_NOTIFIED',
      entityType: 'DoseRecord',
      entityId: dose._id,
      details: { notifiedCount: results.length },
    });

    return { success: true, stage: 3, logs: results };
  }

  // ==========================================
  // STAGE 4: Healthcare Contact Escalation
  // ==========================================
  if (stage === 4) {
    if (user.notificationPreferences?.enableHealthcareEscalation === false) {
      return { skipped: true, reason: 'HEALTHCARE_ESCALATION_DISABLED' };
    }

    const healthcareContacts = await CareContact.find({
      userId: user._id,
      isActive: true,
      role: 'healthcare_professional',
      verificationStatus: 'verified',
    });

    if (healthcareContacts.length === 0) {
      console.log(`[Escalation] No verified healthcare contacts found for patient ${user._id}.`);
      return { skipped: true, reason: 'NO_VERIFIED_HEALTHCARE_CONTACTS' };
    }

    const elapsedMins = isDemo
      ? Math.round((config.demoMode.stage4Seconds || 120) / 60) || 2
      : (user.notificationPreferences?.healthcareGraceMinutes || 120);

    for (const contact of healthcareContacts) {
      const idempotencyKey = `dose_${dose._id}_stage_4_contact_${contact._id}`;
      const existing = await NotificationLog.findOne({ idempotencyKey });
      if (existing) continue;

      const deliveryOutcome = await sendHealthcareAlertEmail({
        to: contact.email,
        contactName: contact.name,
        patientName: user.name,
        scheduledTimeFormatted,
        elapsedMinutes: elapsedMins,
      });

      const log = await NotificationLog.create({
        userId: user._id,
        doseRecordId: dose._id,
        stage: 4,
        recipientEmail: contact.email,
        recipientRole: contact.role,
        recipientName: contact.name,
        channel: 'email',
        status: deliveryOutcome.status || 'ATTEMPTED',
        subject: `MediSync - Clinical Escalation Notice: ${user.name}`,
        contentSnippet: `Clinical escalation for extended unconfirmed dose of ${user.name}`,
        idempotencyKey,
        jobId,
      });

      dose.escalationHistory.push({
        stage: 4,
        sentAt: new Date(),
        recipientEmail: contact.email,
        recipientRole: contact.role,
        status: deliveryOutcome.status || 'DELIVERED',
        jobId,
      });

      results.push(log);
    }

    dose.escalationStage = Math.max(dose.escalationStage, 4);
    dose.lastNotifiedAt = new Date();
    await dose.save();

    await AuditEvent.create({
      userId: user._id,
      action: 'ESCALATION_STAGE_4_HEALTHCARE_NOTIFIED',
      entityType: 'DoseRecord',
      entityId: dose._id,
      details: { notifiedCount: results.length },
    });

    return { success: true, stage: 4, logs: results };
  }

  return { skipped: true, reason: 'UNKNOWN_STAGE' };
};
