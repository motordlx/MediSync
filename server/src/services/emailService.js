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

  const host = config.smtp.host ? config.smtp.host.trim().toLowerCase() : '';
  const user = config.smtp.user ? config.smtp.user.trim() : '';
  const pass = config.smtp.pass ? config.smtp.pass.replace(/\s+/g, '') : '';

  if (host && user) {
    const isGmail = host.includes('gmail');
    const transportOptions = isGmail
      ? {
          service: 'gmail',
          auth: {
            user,
            pass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        }
      : {
          host: config.smtp.host.trim(),
          port: config.smtp.port || 587,
          secure: config.smtp.port === 465,
          auth: {
            user,
            pass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        };

    transporter = nodemailer.createTransport(transportOptions);
    console.log(`[Email] Configured SMTP transporter (${isGmail ? 'Gmail Service' : `${config.smtp.host}:${config.smtp.port}`}) for ${user}`);
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

  // Ensure FROM address has a valid format and matches the authenticated user when available
  let fromAddress = config.smtp.from;
  if (config.smtp.user && (!fromAddress || fromAddress.includes('@medisync.local'))) {
    fromAddress = `MediSync Healthcare <${config.smtp.user.trim()}>`;
  }

  try {
    const info = await mailTransporter.sendMail({
      from: fromAddress,
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
    const isTemporary = error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT' || (error.responseCode >= 400 && error.responseCode < 500);
    
    return {
      status: 'FAILED',
      errorMessage: error.message,
      isTemporary,
    };
  }
};

/**
 * Diagnostic tool to verify SMTP credentials and send a test message
 */
export const verifyAndSendTestEmail = async (targetEmail) => {
  const mailTransporter = getTransporter();
  if (!mailTransporter) {
    return {
      success: false,
      status: 'SIMULATED',
      message: 'No SMTP credentials configured. The server is running in Simulated Email Mode.',
    };
  }

  try {
    await mailTransporter.verify();
    const result = await deliverMail({
      to: targetEmail,
      subject: 'MediSync - Email Notification Test',
      text: 'Hello from MediSync! Your email notification system is connected and working successfully.',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #0f172a;">
          <h2 style="color: #0d9488;">✅ MediSync Email Service Verified</h2>
          <p>This test email confirms that your SMTP notification engine is properly connected and delivering notifications.</p>
          <p style="font-size: 13px; color: #64748b;">Sent to: <b>${targetEmail}</b> at ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    if (result.status === 'ACCEPTED' || result.status === 'ATTEMPTED') {
      return {
        success: true,
        message: `Test email successfully dispatched to ${targetEmail}`,
        details: result,
      };
    } else {
      return {
        success: false,
        message: result.errorMessage || 'Email was rejected by the mail provider.',
        details: result,
      };
    }
  } catch (err) {
    return {
      success: false,
      message: err.message,
      code: err.code,
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
