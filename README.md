# MediSync — Smart Medicine Reminder & Adherence Monitoring Platform

MediSync is a full-stack healthcare web application designed to help patients manage daily medication schedules and provide an intelligent, multi-stage notification escalation system when scheduled doses remain unconfirmed.

---

## Table of Contents

1. [Overview & Philosophy](#overview--philosophy)
2. [Notification Escalation Workflow](#notification-escalation-workflow)
3. [Technology Stack](#technology-stack)
4. [System Architecture](#system-architecture)
5. [Prerequisites](#prerequisites)
6. [Quick Start & Installation](#quick-start--installation)
7. [Environment Variables](#environment-variables)
8. [Running MongoDB and Redis](#running-mongodb-and-redis)
9. [Running Services](#running-services)
10. [Email Delivery Configuration](#email-delivery-configuration)
11. [Demonstration Mode (Accelerated Timeline)](#demonstration-mode-accelerated-timeline)
12. [Testing](#testing)
13. [Deployment Architecture](#deployment-architecture)
14. [Security & Limitations](#security--limitations)

---

## 1. Overview & Philosophy

Managing recurring prescriptions is often fraught with missed doses and communication gaps. MediSync solves this through scheduled dose generation, personal reminders, and progressive escalation to authorized caregivers and healthcare contacts.

### Critical Healthcare Philosophy & Terminology:
- **Confirmation vs. Ingestion:** The system records whether a dose has been *confirmed* on the dashboard. It cannot certify physical ingestion. MediSync uses accurate terminology such as **"Unconfirmed dose"** rather than presuming a patient skipped medication.
- **Prescription Integrity:** MediSync is an adherence tracking and scheduling system. It does not recommend dosages, alter clinical prescriptions, or make medical triage decisions.

---

## 2. Notification Escalation Workflow

When a patient does not confirm a dose, MediSync executes a 4-stage configurable escalation pipeline:

```
[ Scheduled Time (e.g. 08:00 AM) ]
                │
                ▼
        STAGE 1: Primary Reminder
        • Sent to patient via email
        • Dose status moves to DUE
                │
     (Grace Period, e.g. 15 min / 30s demo)
                ▼
        STAGE 2: Unconfirmed Follow-up
        • Sent to patient
        • Dose status moves to UNCONFIRMED
                │
     (Caregiver Interval, e.g. 60 min / 60s demo)
                ▼
        STAGE 3: Care Circle Alert
        • Sent to verified family members / caregivers
        • Recommends checking in on patient well-being
                │
     (Clinical Interval, e.g. 120 min / 120s demo)
                ▼
        STAGE 4: Healthcare Contact Escalation
        • Sent to verified physician or clinic
        • Extended non-confirmation record logged
```

### Escalation Safety Rules:
1. **Real-time verification:** The worker checks fresh database state before every dispatch.
2. **Immediate stoppage upon confirmation:** Once marked as TAKEN, all future escalation jobs are cancelled immediately.
3. **Idempotency keys:** Unique keys (`dose_{id}_stage_{stage}`) prevent duplicate emails.
4. **Late confirmation support:** Confirming after an escalation preserves past notification history while halting future alerts.
5. **Contact verification gate:** Notifications are only sent to contacts with `verificationStatus: 'verified'`. Unverified contacts are never emailed.

---

## 3. Technology Stack

### Frontend:
- **Framework:** React 19 + Vite 8
- **Routing:** React Router v7
- **Styling:** Tailwind CSS v4 + Plus Jakarta Sans & Inter typography
- **HTTP Client:** Axios with JWT request/response interceptors
- **Icons:** Lucide React
- **Testing:** Vitest + React Testing Library + jsdom

### Backend:
- **Runtime:** Node.js (ES Modules)
- **Web Framework:** Express.js 5
- **Database:** MongoDB with Mongoose 9 (supports MongoDB Community, Atlas, and automatic embedded MongoDB fallback)
- **Authentication:** JWT (JSON Web Tokens) + bcryptjs password hashing
- **Security:** Helmet, CORS, and Express Rate Limit

### Background Processing & Escalation:
- **Job Queue:** BullMQ with persistent Redis backend
- **Worker:** Dedicated escalation worker with startup job reconciliation
- **Timers:** Persistent delayed Redis jobs (no volatile in-memory `setTimeout`)

### Email Delivery:
- **Mailer:** Nodemailer
- **Templates:** Responsive HTML templates with plain-text fallback
- **Delivery Logging:** Real-time outcome tracking (`QUEUED`, `ATTEMPTED`, `ACCEPTED`, `DELIVERED`, `SIMULATED`, `FAILED`)

---

## 4. System Architecture

```
mt-project/
├── client/                     # Vite React Frontend
│   ├── src/
│   │   ├── api/                # Axios instance with auth interceptor
│   │   ├── context/            # AuthContext, DemoContext
│   │   ├── components/         # Status badges, Modals, Demo panel, Layout
│   │   ├── pages/              # Dashboard, Medicines, Schedule, History, Care Circle, Settings
│   │   └── test/               # Component unit tests
├── server/                     # Express.js REST API & Worker
│   ├── src/
│   │   ├── config/             # DB, Redis, environment, mailer configuration
│   │   ├── models/             # User, Medicine, Schedule, DoseRecord, CareContact, NotificationLog, AuditEvent
│   │   ├── middleware/         # JWT authentication, error handling, validation
│   │   ├── routes/             # Auth, medicines, schedules, doses, contacts, dashboard, demo
│   │   ├── controllers/        # REST controllers with multi-tenant isolation
│   │   ├── services/           # Dose generation, escalation engine, email service, BullMQ queue
│   │   ├── workers/            # BullMQ background worker & restart reconciliation
│   │   ├── templates/          # Responsive HTML email templates
│   │   ├── server.js           # API HTTP server entry point
│   │   └── worker.js           # Dedicated worker process entry point
│   └── tests/                  # Integration tests (auth, scheduling, escalation, tenant isolation)
├── package.json                # Root orchestrator scripts
└── .env.example                # Canonical environment variable reference
```

---

## 5. Prerequisites

- **Node.js:** v18.0.0 or later (v20+ recommended)
- **Redis:** Running locally or via Docker / cloud (default: `redis://127.0.0.1:6379`)
- **MongoDB:** Local MongoDB daemon, cloud MongoDB Atlas URI, or embedded MongoDB memory server (automatic fallback provided out-of-the-box!)

---

## 6. Quick Start & Installation

Clone and install dependencies:

```bash
git clone <repository-url>
cd mt-project

# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

Copy the environment file:

```bash
cp .env.example server/.env
```

---

## 7. Environment Variables

Create `server/.env` based on `.env.example`:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/medisync

# Redis (for BullMQ)
REDIS_URL=redis://127.0.0.1:6379

# Authentication
JWT_SECRET=your_super_secret_jwt_random_key_here_min_32_characters
JWT_EXPIRES_IN=7d

# Scheduling
DEFAULT_TIMEZONE=Asia/Kolkata

# Email (Leave blank to operate in safe Simulated/Log mode)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="MediSync Healthcare <reminders@medisync.local>"

# Demonstration Mode
ENABLE_DEMO_MODE=true
DEMO_STAGE2_SECONDS=30
DEMO_STAGE3_SECONDS=60
DEMO_STAGE4_SECONDS=120
```

---

## 8. Running MongoDB and Redis

### Starting Redis:
On macOS via Homebrew:
```bash
brew services start redis
# or run foreground daemon:
redis-server --daemonize yes
```

Using Docker:
```bash
docker run -d -p 6379:6379 --name medisync-redis redis:alpine
```

### Starting MongoDB:
- **Automatic Fallback:** If MongoDB is not running locally, MediSync automatically spins up an embedded MongoDB binary for local development and testing!
- Or start local MongoDB:
```bash
brew services start mongodb-community
# or via Docker:
docker run -d -p 27017:27017 --name medisync-mongo mongo:latest
```

---

## 9. Running Services

### Option A: Run Everything Concurrently (Recommended)
From the project root:
```bash
npm run dev
```
This boots the API server (`:5000`), the BullMQ worker, and the Vite frontend (`:3000`) simultaneously.

### Option B: Run Services Individually
- **API Server:**
  ```bash
  npm run dev:server
  ```
- **Dedicated Background Worker:**
  ```bash
  npm run dev:worker
  ```
- **Vite Frontend:**
  ```bash
  npm run dev:client
  ```

Open your browser at **`http://localhost:3000`**.

---

## 10. Email Delivery Configuration

MediSync provides two delivery modes:

1. **Safe Simulated Mode (Default):**
   When `SMTP_HOST` is left empty, all email alerts are simulated and logged to the console and stored directly in `NotificationLog`. This prevents accidental emails to real family members during development or testing.
2. **Live SMTP Provider:**
   To send real emails, populate the SMTP environment variables in `server/.env` (e.g. Mailtrap, SendGrid, Amazon SES, or custom SMTP):
   ```env
   SMTP_HOST=smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_USER=your_mailtrap_user
   SMTP_PASS=your_mailtrap_password
   SMTP_FROM="MediSync Reminders <reminders@yourdomain.com>"
   ```

---

## 11. Demonstration Mode (Accelerated Timeline)

During project evaluations and presentations, waiting 15 to 120 minutes for escalation is impractical.

MediSync includes a **Live Demo Controller** that accelerates the notification schedule without altering core business logic:

| Escalation Stage | Production Timing | Demo Mode Timing | Recipient |
| :--- | :--- | :--- | :--- |
| **Stage 1 (Reminder)** | Scheduled time (0m) | Immediate (0s) | Patient |
| **Stage 2 (Follow-up)** | +15 minutes | +30 seconds | Patient |
| **Stage 3 (Caregiver Alert)** | +60 minutes | +60 seconds | Verified Caregiver / Family |
| **Stage 4 (Doctor Escalation)** | +120 minutes | +120 seconds | Verified Healthcare Contact |

### How to use Demo Mode:
1. Click the amber **"Presentation Demo Mode"** badge in the top navigation bar.
2. Click **"Seed Sample Scenario"** to instantly generate verified sample contacts (*Sarah Chen*, *Dr. Emily Watson*) and medicines (*Lisinopril*, *Metformin*).
3. Click **"Enqueue Test Dose"** to schedule a live dose due immediately.
4. Watch the BullMQ queue state update live, or click **"Stage 2"**, **"Stage 3"**, **"Stage 4"** to fast-forward stages on demand.
5. Confirm doses in real time to see pending jobs get cancelled automatically.
6. Click **"Reset Demo Data"** to safely clean up all test doses and logs.

---

## 12. Testing

Run all automated unit and integration tests:

```bash
# Run both server and client test suites
npm test

# Run backend API and escalation tests only
npm run test:server

# Run frontend React component tests only
npm run test:client
```

### Verified Test Cases:
- User registration, login, and JWT generation
- Multi-tenant data isolation (cross-patient access prevention)
- Recurring schedule handling and individual dose record creation
- Dose confirmation and late confirmation audit logging
- Automatic cancellation of future doses upon schedule pause/deletion
- Sequential escalation stages 1 through 4
- Escalation stoppage immediately after confirmation
- Duplicate notification prevention (idempotency enforcement)
- Verification gates for Care Circle contacts
- Accelerated demo mode triggers

---

## 13. Deployment Architecture

For production deployment:
- **Frontend:** Build static bundle via `npm run build --prefix client` and serve via Nginx, Cloudflare Pages, or AWS S3/CloudFront.
- **Backend API:** Run `node src/server.js` behind a reverse proxy (e.g., Nginx, Caddy, AWS ALB) with HTTPS enabled.
- **Worker:** Run `node src/worker.js` as an independent background process (e.g., via PM2, systemd, or Kubernetes Deployment).
- **Database:** MongoDB Atlas replica set with connection pooling.
- **Queue Broker:** Managed Redis cluster (e.g., Redis Cloud, AWS ElastiCache).

---

## 14. Security & Limitations

1. **Authentication & Authorization:** All API endpoints (except public login, registration, and invitation acceptance) are guarded by JWT bearer verification and strictly scope queries to `req.user._id`.
2. **Tenant Isolation:** A patient can never view, mutate, or confirm another patient's medication doses by manipulating identifiers in requests.
3. **Audit Trails:** All confirmations, cancellations, invitations, and escalations are immutably recorded in the `AuditEvent` and `NotificationLog` collections.
4. **Healthcare Privacy Notice:** MediSync does not claim full HIPAA or GDPR compliance out of the box without organizational administrative controls, BAA agreements, and audit sign-off.
