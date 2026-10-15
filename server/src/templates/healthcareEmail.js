import { wrapEmailHtml } from './emailLayout.js';

export const getHealthcareEmail = ({ contactName, patientName, scheduledTimeFormatted, elapsedMinutes }) => {
  const bodyContent = `
    <h1>Healthcare Notification: Extended Unconfirmed Dose</h1>
    <p>Dear ${contactName},</p>
    <p>This automated escalation is sent to your registered clinic or healthcare practice on behalf of your patient <strong>${patientName}</strong>.</p>
    <p>A scheduled medication dose has remained unconfirmed for an extended window of <strong>${elapsedMinutes} minutes</strong> despite multiple reminders and caregiver escalation.</p>
    
    <div class="card alert-card">
      <div class="card-title">Escalation Stage 4: Healthcare Contact</div>
      <div class="card-val" style="color: #b91c1c;">Extended Non-Confirmation Recorded</div>
      <div class="card-sub">Patient: <strong>${patientName}</strong></div>
      <div class="card-sub">Scheduled Time: ${scheduledTimeFormatted}</div>
      <div class="card-sub">Current Status: Unconfirmed</div>
    </div>

    <p style="font-size: 13px; color: #64748b;">
      Note: This system tracks confirmation submissions. It does not certify physical ingestion or constitute an emergency dispatch service.
    </p>
  `;

  const html = wrapEmailHtml({
    title: `MediSync - Clinical Escalation: ${patientName}`,
    preheader: `Extended unconfirmed dose alert for patient ${patientName}.`,
    bodyContent,
    footerText: `You are receiving this notification because ${patientName} authorized your contact as their healthcare contact.`,
  });

  const text = `
Dear ${contactName},

This automated notification is sent to your registered healthcare contact for patient ${patientName}.
A scheduled medication dose (${scheduledTimeFormatted}) has remained unconfirmed for ${elapsedMinutes} minutes despite reminders.

Status: Unconfirmed
Notice: MediSync records confirmation submissions only and does not substitute for medical triage.

Regards,
MediSync Clinical Integration System
  `.trim();

  return {
    subject: `MediSync - Clinical Escalation Notice: ${patientName}`,
    html,
    text,
  };
};
