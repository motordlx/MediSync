import { wrapEmailHtml } from './emailLayout.js';

export const getReminderEmail = ({ patientName, medicineName, scheduledTimeFormatted, instructions, appUrl, includeMedicineName }) => {
  const medDisplay = includeMedicineName ? (medicineName || 'Scheduled medication') : 'Scheduled medication';

  const bodyContent = `
    <h1>Medicine Reminder</h1>
    <p>Hello ${patientName},</p>
    <p>Your scheduled medication is due now. Please review your schedule and confirm your dose once taken.</p>
    
    <div class="card">
      <div class="card-title">Scheduled For</div>
      <div class="card-val">${scheduledTimeFormatted}</div>
      ${includeMedicineName ? `<div class="card-sub">Medication: <strong>${medDisplay}</strong></div>` : ''}
      ${instructions ? `<div class="card-sub" style="margin-top: 6px; font-style: italic;">Instructions: "${instructions}"</div>` : ''}
    </div>

    <p>If you have already taken your dose, please open your MediSync dashboard and confirm it so your care circle stays informed.</p>
  `;

  const html = wrapEmailHtml({
    title: 'MediSync - Your medicine reminder',
    preheader: `Your scheduled medication is due now (${scheduledTimeFormatted}).`,
    bodyContent,
    ctaUrl: `${appUrl}/dashboard`,
    ctaText: 'Open MediSync & Confirm Dose',
    footerText: 'You received this email because you configured reminder notifications on MediSync.',
  });

  const text = `
Hello ${patientName},

Your scheduled medication is due now (${scheduledTimeFormatted}).
${includeMedicineName ? `Medication: ${medDisplay}\n` : ''}${instructions ? `Instructions: ${instructions}\n` : ''}
Please open MediSync to review your schedule and confirm whether you have taken your medicine:
${appUrl}/dashboard

If you have already taken it, update its status in your dashboard.

Regards,
MediSync
  `.trim();

  return {
    subject: 'MediSync - Your medicine reminder',
    html,
    text,
  };
};
