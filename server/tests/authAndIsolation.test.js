import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { Medicine } from '../src/models/Medicine.js';

describe('Authentication & Tenant Isolation', () => {
  it('registers a new user and returns a valid JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Patient John Doe',
        email: 'john.doe@example.com',
        password: 'Password123!',
        timezone: 'Asia/Kolkata',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.name).toBe('Patient John Doe');
    expect(res.body.user.email).toBe('john.doe@example.com');
    expect(res.body.user.password).toBeUndefined(); // Should never leak password hash
  });

  it('rejects registration with duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'John Doe',
        email: 'john.duplicate@example.com',
        password: 'Password123!',
      });

    const duplicateRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'john.duplicate@example.com',
        password: 'Password123!',
      });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.success).toBe(false);
  });

  it('authenticates user with valid credentials and rejects bad password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Smith',
        email: 'alice@example.com',
        password: 'CorrectPassword123!',
      });

    // Valid login
    const validRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alice@example.com',
        password: 'CorrectPassword123!',
      });
    expect(validRes.status).toBe(200);
    expect(validRes.body.token).toBeDefined();

    // Invalid login
    const invalidRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alice@example.com',
        password: 'WrongPassword!',
      });
    expect(invalidRes.status).toBe(401);
  });

  it('strictly enforces tenant isolation: Patient A cannot access Patient B medicine', async () => {
    // 1. Create Patient A
    const userARes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Patient A',
        email: 'patientA@example.com',
        password: 'Password123!',
      });
    const tokenA = userARes.body.token;

    // 2. Create Patient B
    const userBRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Patient B',
        email: 'patientB@example.com',
        password: 'Password123!',
      });
    const tokenB = userBRes.body.token;

    // 3. Patient A creates a medicine
    const medRes = await request(app)
      .post('/api/medicines')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Lisinopril 10mg',
        instructions: 'Take in morning',
        dosage: '10mg',
      });
    expect(medRes.status).toBe(201);
    const medId = medRes.body.medicine._id;

    // 4. Patient B attempts to read Patient A's medicine by ID -> Expect 404/Denied
    const accessRes = await request(app)
      .get(`/api/medicines/${medId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(accessRes.status).toBe(404);

    // 5. Patient B attempts to update Patient A's medicine by ID -> Expect 404/Denied
    const updateRes = await request(app)
      .put(`/api/medicines/${medId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Hacked Medicine' });
    expect(updateRes.status).toBe(404);

    // Verify Patient A medicine unchanged in DB
    const dbMed = await Medicine.findById(medId);
    expect(dbMed.name).toBe('Lisinopril 10mg');
  });
});
