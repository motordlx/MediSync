import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import { getReminderEmail } from '../templates/reminderEmail.js';
import { getFollowupEmail } from '../templates/followupEmail.js';
import { getCaregiverEmail } from '../templates/caregiverEmail.js';
import { getHealthcareEmail } from '../templates/healthcareEmail.js';
import { getInvitationEmail } from '../templates/invitationEmail.js';

let transporter = null;

// Initialize transporter on startup or on demand
export const getTransporter = () => {
  if (transporter) return transporter;

  if (config.smtp.host && config.smtp.user) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass ? config.smtp.pass.replace(/\s+/g, '') : '',
      },
      tls: {
        rejectUnauthorized: config.nodeEnv === 'production',
      },
    });
    console.log(`[Email] Configured SMTP transporter with host ${config.smtp.host}:${config.smtp.port}`);
  } else {
    // Development or test environment without live credentials
    transporter = null;
    console.log('[Email] No SMTP credentials provided. Operating in safe Simulated/Log Mode.');
  }

  return transporter;
};

/**
 * Base delivery function handling SMTP vs simulated delivery, outcome tracking, and error categorization
 */
export const deliverMail = async ({ to, subject, html, text }) => {
  const mailTransporter = getTransporter();

  // Test / Simulated mode
  if (!mailTransporter) {
    console.log(`[Email-Simulated] >>> TO: ${to} | SUBJECT: ${subject}`);
    return {
      status: 'SIMULATED',
      messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      accepted: [to],
      rejected: [],
    };
  }

  try {
    const info = await mailTransporter.sendMail({
      from: config.smtp.from,
      to,
      subject,
      text,
      html,
    });

    const isAccepted = Array.isArray(info.accepted) && info.accepted.includes(to);

    return {
      status: isAccepted ? 'ACCEPTED' : 'ATTEMPTED',
      messageId: info.messageId,
      accepted: info.accepted || [],
      rejected: info.rejected || [],
      response: info.response,
    };
  } catch (error) {
    console.error(`[Email-Error] Delivery failed to ${to}:`, error.message);
    const isTemporary = error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT' || error.responseCode >= 400 && error.responseCode < 500;
    
    return {
      status: 'FAILED',
      errorMessage: error.message,
      isTemporary,
    };
  }
};

/**
 * Send Stage 1 Reminder
 */
export const sendDoseReminderEmail = async ({ to, patientName, medicineName, scheduledTimeFormatted, instructions, includeMedicineName }) => {
  const { subject, html, text } = getReminderEmail({
    patientName,
    medicineName,
    scheduledTimeFormatted,
    instructions,
    appUrl: config.clientUrl,
    includeMedicineName,
  });

  return deliverMail({ to, subject, html, text });
};

/**
 * Send Stage 2 Follow-up Reminder
 */
export const sendDoseFollowupEmail = async ({ to, patientName, medicineName, scheduledTimeFormatted, gracePeriodMinutes, includeMedicineName }) => {
  const { subject, html, text } = getFollowupEmail({
    patientName,
    medicineName,
    scheduledTimeFormatted,
    gracePeriodMinutes,
    appUrl: config.clientUrl,
    includeMedicineName,
  });

  return deliverMail({ to, subject, html, text });
};

/**
 * Send Stage 3 Caregiver Alert
 */
export const sendCaregiverAlertEmail = async ({ to, caregiverName, patientName, medicineName, scheduledTimeFormatted, elapsedMinutes, includeMedicineName }) => {
  const { subject, html, text } = getCaregiverEmail({
    caregiverName,
    patientName,
    medicineName,
    scheduledTimeFormatted,
    elapsedMinutes,
    includeMedicineName,
  });

  return deliverMail({ to, subject, html, text });
};

/**
 * Send Stage 4 Healthcare Alert
 */
export const sendHealthcareAlertEmail = async ({ to, contactName, patientName, scheduledTimeFormatted, elapsedMinutes }) => {
  const { subject, html, text } = getHealthcareEmail({
    contactName,
    patientName,
    scheduledTimeFormatted,
    elapsedMinutes,
  });

  return deliverMail({ to, subject, html, text });
};

/**
 * Send Care Contact Invitation
 */
export const sendContactInvitationEmail = async ({ to, contactName, patientName, role, verificationToken }) => {
  const verificationUrl = `${config.clientUrl}/verify-invite?token=${verificationToken}`;
  const { subject, html, text } = getInvitationEmail({
    contactName,
    patientName,
    role,
    verificationUrl,
  });

  return deliverMail({ to, subject, html, text });
};
