import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory or root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT, 10) || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/medisync',
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  jwtSecret: process.env.JWT_SECRET || 'medisync_super_secret_jwt_key_development_only_1234567890',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  defaultTimezone: process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'MediSync Reminders <reminders@medisync.local>',
  },
  demoMode: {
    enabled: process.env.ENABLE_DEMO_MODE !== 'false',
    stage2Seconds: parseInt(process.env.DEMO_STAGE2_SECONDS, 10) || 30, // Follow-up
    stage3Seconds: parseInt(process.env.DEMO_STAGE3_SECONDS, 10) || 60, // Caregiver
    stage4Seconds: parseInt(process.env.DEMO_STAGE4_SECONDS, 10) || 120, // Healthcare contact
  }
};
