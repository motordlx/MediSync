/**
 * Common HTML email shell wrapper with responsive styling and accessibility
 */
export const wrapEmailHtml = ({ title, preheader, bodyContent, ctaUrl, ctaText, footerText }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 0; }
    .container { max-width: 580px; margin: 30px auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; padding: 24px 32px; text-align: left; border-bottom: 3px solid #0d9488; }
    .logo { color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; text-decoration: none; }
    .logo span { color: #14b8a6; }
    .content { padding: 32px; }
    h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px; }
    p { font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 16px; }
    .card { background-color: #f1f5f9; border-left: 4px solid #0d9488; border-radius: 6px; padding: 16px 20px; margin: 20px 0; }
    .card-title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; margin-bottom: 4px; }
    .card-val { font-size: 17px; font-weight: 600; color: #0f172a; margin: 0; }
    .card-sub { font-size: 13px; color: #475569; margin-top: 4px; }
    .alert-card { background-color: #fef2f2; border-left: 4px solid #ef4444; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #0d9488; color: #ffffff !important; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(13, 148, 136, 0.2); }
    .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; font-size: 12px; color: #64748b; line-height: 1.5; }
    .footer a { color: #0d9488; text-decoration: none; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || title}
  </div>
  <div class="container">
    <div class="header">
      <div class="logo">Medi<span>Sync</span></div>
    </div>
    <div class="content">
      ${bodyContent}
      ${ctaUrl && ctaText ? `
      <div class="btn-container">
        <a href="${ctaUrl}" class="btn" target="_blank">${ctaText}</a>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      <p style="margin: 0 0 8px 0;">${footerText || 'This is an automated notification from MediSync. Please do not reply directly to this email.'}</p>
      <p style="margin: 0; font-size: 11px; color: #94a3b8;">
        Notice: MediSync is a medication schedule reminder and adherence tracking service. It does not provide medical diagnoses or alter prescriptions.
      </p>
    </div>
  </div>
</body>
</html>
`;
