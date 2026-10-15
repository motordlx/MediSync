import { describe, it, expect } from 'vitest';
import { User } from '../src/models/User.js';
import { Medicine } from '../src/models/Medicine.js';
import { DoseRecord } from '../src/models/DoseRecord.js';
import { CareContact } from '../src/models/CareContact.js';
import { NotificationLog } from '../src/models/NotificationLog.js';
import { processEscalationStage } from '../src/services/escalationService.js';
import { advanceDemoStage } from '../src/services/demoService.js';

describe('Escalation Workflow & Care Circle System', () => {
  it('processes Stage 1, 2, 3, and 4 sequentially for an unconfirmed dose', async () => {
    // 1. Create patient
    const user = await User.create({
      name: 'Escalation Patient',
      email: 'patient.esc@example.com',
      password: 'Password123!',
      timezone: 'Asia/Kolkata',
      notificationPreferences: {
        email: true,
        includeMedicineName: true,
        enableHealthcareEscalation: true,
      },
    });

    // 2. Create Care Circle contacts: Caregiver (verified) and Doctor (verified)
    const caregiver = await CareContact.create({
      userId: user._id,
      name: 'Jane Caregiver',
      email: 'caregiver.jane@example.com',
      relationship: 'Spouse',
      role: 'caregiver',
      verificationStatus: 'verified', // Verified!
      isActive: true,
    });

    const doctor = await CareContact.create({
      userId: user._id,
      name: 'Dr. House',
      email: 'dr.house@clinic.local',
      relationship: 'Physician',
      role: 'healthcare_professional',
      verificationStatus: 'verified', // Verified!
      isActive: true,
    });

    // 3. Create medicine & unconfirmed dose
    const medicine = await Medicine.create({
      userId: user._id,
      name: 'Ramipril 5mg',
      dosage: '5mg',
      instructions: 'Take daily at 8 AM',
    });

    const dose = await DoseRecord.create({
      userId: user._id,
      medicineId: medicine._id,
      scheduledTime: new Date(Date.now() - 30 * 60 * 1000), // 30m ago
      timeString: '08:00',
      status: 'UPCOMING',
    });

    // ==========================================
    // STAGE 1: Initial reminder
    // ==========================================
    const s1Res = await processEscalationStage(dose._id, 1, false);
    expect(s1Res.success).toBe(true);

    const doseAfterS1 = await DoseRecord.findById(dose._id);
    expect(doseAfterS1.escalationStage).toBe(1);
    expect(doseAfterS1.status).toBe('DUE');

    const log1 = await NotificationLog.findOne({ idempotencyKey: `dose_${dose._id}_stage_1` });
    expect(log1).toBeDefined();
    expect(log1.recipientEmail).toBe(user.email);
    expect(log1.stage).toBe(1);

    // ==========================================
    // STAGE 2: Follow-up reminder (Unconfirmed)
    // ==========================================
    const s2Res = await processEscalationStage(dose._id, 2, false);
    expect(s2Res.success).toBe(true);

    const doseAfterS2 = await DoseRecord.findById(dose._id);
    expect(doseAfterS2.escalationStage).toBe(2);
    expect(doseAfterS2.status).toBe('UNCONFIRMED');

    // ==========================================
    // STAGE 3: Caregiver escalation
    // ==========================================
    const s3Res = await processEscalationStage(dose._id, 3, false);
    expect(s3Res.success).toBe(true);

    const doseAfterS3 = await DoseRecord.findById(dose._id);
    expect(doseAfterS3.escalationStage).toBe(3);

    const log3 = await NotificationLog.findOne({
      idempotencyKey: `dose_${dose._id}_stage_3_contact_${caregiver._id}`,
    });
    expect(log3).toBeDefined();
    expect(log3.recipientEmail).toBe('caregiver.jane@example.com');
    expect(log3.recipientRole).toBe('caregiver');

    // ==========================================
    // STAGE 4: Healthcare contact escalation
    // ==========================================
    const s4Res = await processEscalationStage(dose._id, 4, false);
    expect(s4Res.success).toBe(true);

    const doseAfterS4 = await DoseRecord.findById(dose._id);
    expect(doseAfterS4.escalationStage).toBe(4);

    const log4 = await NotificationLog.findOne({
      idempotencyKey: `dose_${dose._id}_stage_4_contact_${doctor._id}`,
    });
    expect(log4).toBeDefined();
    expect(log4.recipientEmail).toBe('dr.house@clinic.local');
  });

  it('strictly stops escalation if dose has been confirmed as TAKEN', async () => {
    const user = await User.create({
      name: 'Confirmed Patient',
      email: 'patient.taken@example.com',
      password: 'Password123!',
    });

    const medicine = await Medicine.create({
      userId: user._id,
      name: 'Metoprolol',
    });

    const dose = await DoseRecord.create({
      userId: user._id,
      medicineId: medicine._id,
      scheduledTime: new Date(),
      timeString: '10:00',
      status: 'TAKEN', // Already confirmed!
      confirmationTimestamp: new Date(),
    });

    // Attempt to trigger Stage 2 follow-up
    const res = await processEscalationStage(dose._id, 2, false);
    expect(res.skipped).toBe(true);
    expect(res.reason).toBe('ALREADY_TAKEN');

    // Attempt to trigger Stage 3 caregiver alert
    const res3 = await processEscalationStage(dose._id, 3, false);
    expect(res3.skipped).toBe(true);
    expect(res3.reason).toBe('ALREADY_TAKEN');

    // No notification log should have been created
    const logs = await NotificationLog.find({ doseRecordId: dose._id });
    expect(logs.length).toBe(0);
  });

  it('prevents duplicate notifications for the same stage (Idempotency)', async () => {
    const user = await User.create({
      name: 'Idempotent Patient',
      email: 'patient.idemp@example.com',
      password: 'Password123!',
    });

    const medicine = await Medicine.create({
      userId: user._id,
      name: 'Amlodipine',
    });

    const dose = await DoseRecord.create({
      userId: user._id,
      medicineId: medicine._id,
      scheduledTime: new Date(),
      timeString: '12:00',
      status: 'UPCOMING',
    });

    // Run Stage 1 once
    const firstRun = await processEscalationStage(dose._id, 1, false);
    expect(firstRun.success).toBe(true);

    // Run Stage 1 again immediately (simulating duplicate worker job)
    const secondRun = await processEscalationStage(dose._id, 1, false);
    expect(secondRun.skipped).toBe(true);
    expect(secondRun.reason).toBe('DUPLICATE_STAGE_1');

    // Verify only 1 log document exists
    const logs = await NotificationLog.find({ doseRecordId: dose._id, stage: 1 });
    expect(logs.length).toBe(1);
  });

  it('never sends caregiver escalation to an unverified contact', async () => {
    const user = await User.create({
      name: 'Verification Patient',
      email: 'patient.unverified@example.com',
      password: 'Password123!',
    });

    // Contact with verificationStatus = 'pending' (NOT verified)
    const unverifiedCaregiver = await CareContact.create({
      userId: user._id,
      name: 'Unverified Bob',
      email: 'bob.unverified@example.com',
      relationship: 'Friend',
      role: 'caregiver',
      verificationStatus: 'pending',
      isActive: true,
    });

    const medicine = await Medicine.create({
      userId: user._id,
      name: 'Losartan',
    });

    const dose = await DoseRecord.create({
      userId: user._id,
      medicineId: medicine._id,
      scheduledTime: new Date(),
      timeString: '14:00',
      status: 'UNCONFIRMED',
    });

    // Run Stage 3
    const result = await processEscalationStage(dose._id, 3, false);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('NO_VERIFIED_CAREGIVERS');

    // Verify no email was dispatched to Bob
    const logs = await NotificationLog.find({ recipientEmail: 'bob.unverified@example.com' });
    expect(logs.length).toBe(0);
  });

  it('advances live demo dose instantly across stages using demo controls', async () => {
    const user = await User.create({
      name: 'Demo Patient',
      email: 'demo.patient@example.com',
      password: 'Password123!',
    });

    const medicine = await Medicine.create({
      userId: user._id,
      name: 'Demo Medicine',
    });

    const dose = await DoseRecord.create({
      userId: user._id,
      medicineId: medicine._id,
      scheduledTime: new Date(),
      timeString: '16:00',
      status: 'DUE',
      isDemo: true,
    });

    // Advance to stage 1
    const adv1 = await advanceDemoStage(dose._id, 1);
    expect(adv1.dose.escalationStage).toBe(1);

    // Advance to stage 2
    const adv2 = await advanceDemoStage(dose._id, 2);
    expect(adv2.dose.escalationStage).toBe(2);
    expect(adv2.dose.status).toBe('UNCONFIRMED');
  });
});
