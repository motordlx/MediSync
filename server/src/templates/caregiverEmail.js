import { wrapEmailHtml } from './emailLayout.js';

export const getCaregiverEmail = ({ caregiverName, patientName, medicineName, scheduledTimeFormatted, elapsedMinutes, includeMedicineName }) => {
  const medDisplay = includeMedicineName && medicineName ? medicineName : 'Scheduled medication';

  const bodyContent = `
    <h1>Care Circle Notification: Unconfirmed Dose</h1>
    <p>Hello ${caregiverName},</p>
    <p>You are receiving this notification as an authorized Care Circle contact for <strong>${patientName}</strong>.</p>
    <p>A scheduled medication dose has remained unconfirmed after the scheduled time and follow-up grace window.</p>
    
    <div class="card alert-card">
      <div class="card-title">Notification Notice</div>
      <div class="card-val" style="color: #b91c1c;">Unconfirmed Medication Dose</div>
      <div class="card-sub">Patient: <strong>${patientName}</strong></div>
      <div class="card-sub">Scheduled Time: ${scheduledTimeFormatted} (${elapsedMinutes} minutes elapsed)</div>
      ${includeMedicineName ? `<div class="card-sub" style="margin-top: 4px;">Medication: <strong>${medDisplay}</strong></div>` : ''}
    </div>

    <p><strong>Recommended Action:</strong> Please reach out to ${patientName} to check on their well-being. Please note that the patient may have physically taken their medicine but simply forgotten to confirm it on the system.</p>
  `;

  const html = wrapEmailHtml({
    title: `MediSync - Notification regarding ${patientName}'s schedule`,
    preheader: `An unconfirmed medication dose was noted for ${patientName} (${scheduledTimeFormatted}).`,
    bodyContent,
    footerText: `You are receiving this because ${patientName} registered and verified you as their Care Circle contact on MediSync.`,
  });

  const text = `
Hello ${caregiverName},

You are receiving this notification as an authorized Care Circle contact for ${patientName}.
A scheduled medication dose (${scheduledTimeFormatted}) has remained unconfirmed after ${elapsedMinutes} minutes.
${includeMedicineName ? `Medication: ${medDisplay}\n` : ''}
Please consider reaching out to ${patientName} to check in. Note that they may have physically taken their medicine without recording it in their dashboard.

Regards,
MediSync Care Circle System
  `.trim();

  return {
    subject: `MediSync - Notification regarding ${patientName}'s schedule`,
    html,
    text,
  };
};
