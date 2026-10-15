import { wrapEmailHtml } from './emailLayout.js';

export const getInvitationEmail = ({ contactName, patientName, role, verificationUrl }) => {
  const roleName = role === 'healthcare_professional' ? 'Healthcare Contact' : (role === 'family_member' ? 'Family Circle Member' : 'Caregiver');

  const bodyContent = `
    <h1>Care Circle Invitation</h1>
    <p>Hello ${contactName},</p>
    <p><strong>${patientName}</strong> has invited you to join their Care Circle on <strong>MediSync</strong> as their <strong>${roleName}</strong>.</p>
    
    <div class="card">
      <div class="card-title">Invitation Role</div>
      <div class="card-val">${roleName}</div>
      <div class="card-sub">Patient: <strong>${patientName}</strong></div>
      <div class="card-sub" style="margin-top: 6px;">
        As a verified contact, you will receive timely notifications if ${patientName} does not confirm a scheduled medication dose within their grace period.
      </div>
    </div>

    <p>To accept this invitation and verify your email address, please click the button below:</p>
  `;

  const html = wrapEmailHtml({
    title: `MediSync - Invitation from ${patientName}`,
    preheader: `${patientName} has invited you to join their MediSync Care Circle.`,
    bodyContent,
    ctaUrl: verificationUrl,
    ctaText: 'Accept Invitation & Verify',
    footerText: 'If you did not expect this invitation or do not know the patient, you may safely disregard this message.',
  });

  const text = `
Hello ${contactName},

${patientName} has invited you to join their Care Circle on MediSync as their ${roleName}.
As a verified contact, you will receive helpful notifications if a scheduled dose remains unconfirmed.

To accept and verify your email, visit:
${verificationUrl}

Regards,
MediSync Care Circle
  `.trim();

  return {
    subject: `MediSync - Care Circle Invitation from ${patientName}`,
    html,
    text,
  };
};
