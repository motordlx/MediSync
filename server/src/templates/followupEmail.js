import { wrapEmailHtml } from './emailLayout.js';

export const getFollowupEmail = ({ patientName, medicineName, scheduledTimeFormatted, gracePeriodMinutes, appUrl, includeMedicineName }) => {
  const medDisplay = includeMedicineName ? (medicineName || 'Scheduled medication') : 'Scheduled medication';

  const bodyContent = `
    <h1>Follow-up: Unconfirmed Dose</h1>
    <p>Hello ${patientName},</p>
    <p>This is a gentle follow-up regarding your dose scheduled for <strong>${scheduledTimeFormatted}</strong>. Our system has not yet received a confirmation for this dose.</p>
    
    <div class="card" style="border-left-color: #f59e0b;">
      <div class="card-title">Dose Status</div>
      <div class="card-val" style="color: #b45309;">Awaiting Confirmation</div>
      <div class="card-sub">Scheduled Time: ${scheduledTimeFormatted} (${gracePeriodMinutes} min grace period elapsed)</div>
      ${includeMedicineName ? `<div class="card-sub" style="margin-top: 4px;">Medication: <strong>${medDisplay}</strong></div>` : ''}
    </div>

    <p>If you have already taken this medication, please mark it as confirmed in your dashboard to prevent automatic notifications to your Care Circle.</p>
  `;

  const html = wrapEmailHtml({
    title: 'MediSync - Follow-up: Dose Awaiting Confirmation',
    preheader: `Follow-up reminder: Scheduled dose for ${scheduledTimeFormatted} is unconfirmed.`,
    bodyContent,
    ctaUrl: `${appUrl}/dashboard`,
    ctaText: 'Confirm Dose in MediSync',
    footerText: 'This follow-up was automatically triggered according to your personal notification settings.',
  });

  const text = `
Hello ${patientName},

This is a gentle follow-up regarding your dose scheduled for ${scheduledTimeFormatted}. Our system has not yet received a confirmation for this dose.
${includeMedicineName ? `Medication: ${medDisplay}\n` : ''}
If you have already taken your medicine, please open your dashboard and mark it as confirmed to prevent escalation to your Care Circle:
${appUrl}/dashboard

Regards,
MediSync
  `.trim();

  return {
    subject: 'MediSync - Follow-up: Dose Awaiting Confirmation',
    html,
    text,
  };
};
