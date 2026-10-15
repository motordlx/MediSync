import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { DoseRecord } from '../src/models/DoseRecord.js';
import { MedicationSchedule } from '../src/models/MedicationSchedule.js';

describe('Medication Scheduling & Dose Record Generation', () => {
  it('generates individual dose records for scheduled times across days', async () => {
    // 1. Register user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Schedule Tester',
        email: 'sched.test@example.com',
        password: 'Password123!',
        timezone: 'Asia/Kolkata',
      });
    const token = regRes.body.token;

    // 2. Create medicine
    const medRes = await request(app)
      .post('/api/medicines')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Metformin 500mg',
        instructions: 'Take after meals',
        dosage: '500mg',
      });
    const medId = medRes.body.medicine._id;

    // 3. Create schedule with 2 distinct times per day (08:00 and 20:00)
    const schedRes = await request(app)
      .post('/api/schedules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        medicineId: medId,
        times: ['08:00', '20:00'],
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      });

    expect(schedRes.status).toBe(201);
    expect(schedRes.body.generatedDosesCount).toBeGreaterThan(0);

    // 4. Verify in DB that individual separate DoseRecord documents were created
    const doses = await DoseRecord.find({ medicineId: medId });
    expect(doses.length).toBeGreaterThanOrEqual(4); // 2 times per day * multiple days
    expect(doses[0]).toHaveProperty('scheduledTime');
    expect(doses[0]).toHaveProperty('status');
    expect(['UPCOMING', 'DUE']).toContain(doses[0].status);
  });

  it('confirms a dose successfully and records confirmation timestamp', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Confirmation Tester',
        email: 'confirm.test@example.com',
        password: 'Password123!',
      });
    const token = regRes.body.token;

    const medRes = await request(app)
      .post('/api/medicines')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Aspirin 81mg' });
    const medId = medRes.body.medicine._id;

    // Create a dose record directly
    const dose = await DoseRecord.create({
      userId: regRes.body.user._id,
      medicineId: medId,
      scheduledTime: new Date(),
      timeString: '09:00',
      status: 'DUE',
    });

    // Confirm dose via API
    const confirmRes = await request(app)
      .post(`/api/doses/${dose._id}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'Taken with water' });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.dose.status).toBe('TAKEN');
    expect(confirmRes.body.dose.confirmationTimestamp).toBeDefined();

    // Verify in database
    const updated = await DoseRecord.findById(dose._id);
    expect(updated.status).toBe('TAKEN');
    expect(updated.notes).toBe('Taken with water');
  });

  it('supports late confirmations without overwriting notification history', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Late Confirmation Tester',
        email: 'late.test@example.com',
        password: 'Password123!',
      });
    const token = regRes.body.token;

    const medRes = await request(app)
      .post('/api/medicines')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Thyroxine 50mcg' });

    // Dose with an existing notification in history
    const pastTime = new Date(Date.now() - 90 * 60 * 1000); // 90 min ago
    const dose = await DoseRecord.create({
      userId: regRes.body.user._id,
      medicineId: medRes.body.medicine._id,
      scheduledTime: pastTime,
      timeString: '07:00',
      status: 'UNCONFIRMED',
      escalationStage: 2,
      escalationHistory: [
        {
          stage: 1,
          sentAt: pastTime,
          recipientEmail: 'late.test@example.com',
          recipientRole: 'patient',
          status: 'DELIVERED',
        },
        {
          stage: 2,
          sentAt: new Date(pastTime.getTime() + 15 * 60 * 1000),
          recipientEmail: 'late.test@example.com',
          recipientRole: 'patient',
          status: 'DELIVERED',
        },
      ],
    });

    // Late confirmation
    const confirmRes = await request(app)
      .post(`/api/doses/${dose._id}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'Apologies, took it earlier but forgot to log' });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.isLate).toBe(true);

    const updated = await DoseRecord.findById(dose._id);
    expect(updated.status).toBe('TAKEN');
    // Notification history must NOT be wiped
    expect(updated.escalationHistory.length).toBe(2);
    expect(updated.escalationHistory[0].stage).toBe(1);
    expect(updated.escalationHistory[1].stage).toBe(2);
  });

  it('cancels future doses when a schedule is paused or deleted', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Cancellation Tester',
        email: 'cancel.test@example.com',
        password: 'Password123!',
      });
    const token = regRes.body.token;

    const medRes = await request(app)
      .post('/api/medicines')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Atorvastatin' });

    const schedRes = await request(app)
      .post('/api/schedules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        medicineId: medRes.body.medicine._id,
        times: ['21:00'],
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      });

    const schedId = schedRes.body.schedule._id;

    // Toggle schedule off
    const toggleRes = await request(app)
      .patch(`/api/schedules/${schedId}/toggle`)
      .set('Authorization', `Bearer ${token}`);

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.schedule.isActive).toBe(false);

    // Verify upcoming doses became CANCELLED
    const cancelledCount = await DoseRecord.countDocuments({
      scheduleId: schedId,
      status: 'CANCELLED',
    });
    expect(cancelledCount).toBeGreaterThan(0);
  });
});
