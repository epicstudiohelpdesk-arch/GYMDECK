/**
 * GymDeck Cloud Backend - Transactional Email Templates
 */

export interface EmailTemplatePayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export function renderVerificationOtpEmail(recipientEmail: string, otp: string): EmailTemplatePayload {
  const subject = 'Your GymDeck Verification Code';
  const text = `Welcome to GymDeck!\n\nYour 6-digit verification code is: ${otp}\n\nThis code expires in 10 minutes. If you did not create a GymDeck account, you can safely ignore this message.`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0F111A; color: #FFFFFF; margin: 0; padding: 40px 20px; }
    .container { max-width: 520px; margin: 0 auto; background-color: #1A1D2B; border-radius: 16px; border: 1px solid #282D42; padding: 36px; }
    .logo-badge { display: inline-block; background: linear-gradient(135deg, #FF5E62 0%, #FF9966 100%); color: #FFFFFF; font-weight: 900; font-size: 16px; padding: 6px 14px; border-radius: 8px; margin-bottom: 24px; letter-spacing: 0.5px; }
    h1 { font-size: 22px; font-weight: 800; color: #FFFFFF; margin-top: 0; margin-bottom: 12px; }
    p { color: #94A3B8; font-size: 14px; line-height: 22px; margin-bottom: 24px; }
    .otp-card { background-color: #090A0F; border: 1px dashed #FF5E62; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .otp-code { font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #FF5E62; font-family: 'SFMono-Regular', Consolas, Menlo, monospace; }
    .expiry-note { font-size: 12px; color: #64748B; margin-top: 8px; }
    .footer { font-size: 11px; color: #64748B; border-top: 1px solid #282D42; padding-top: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-badge">GYMDECK</div>
    <h1>Verify Your Email Address</h1>
    <p>Welcome to GymDeck! To complete your member mobile account registration, please enter the following 6-digit verification code:</p>
    <div class="otp-card">
      <div class="otp-code">${otp}</div>
      <div class="expiry-note">Valid for 10 minutes &bull; Single-use only</div>
    </div>
    <p>If you did not request this code, please disregard this email. Your account remains secure.</p>
    <div class="footer">
      &copy; ${new Date().getFullYear()} GymDeck Fitness Platform. All rights reserved.
    </div>
  </div>
</body>
</html>
  `;

  return { to: recipientEmail, subject, html, text };
}

export function renderPasswordResetEmail(recipientEmail: string, resetToken: string): EmailTemplatePayload {
  const subject = 'Reset Your GymDeck Password';
  const text = `Hello,\n\nWe received a request to reset your GymDeck account password.\n\nYour password reset authorization token is:\n${resetToken}\n\nThis token expires in 15 minutes. If you did not request a password reset, please secure your account.`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0F111A; color: #FFFFFF; margin: 0; padding: 40px 20px; }
    .container { max-width: 520px; margin: 0 auto; background-color: #1A1D2B; border-radius: 16px; border: 1px solid #282D42; padding: 36px; }
    .logo-badge { display: inline-block; background: linear-gradient(135deg, #FF5E62 0%, #FF9966 100%); color: #FFFFFF; font-weight: 900; font-size: 16px; padding: 6px 14px; border-radius: 8px; margin-bottom: 24px; letter-spacing: 0.5px; }
    h1 { font-size: 22px; font-weight: 800; color: #FFFFFF; margin-top: 0; margin-bottom: 12px; }
    p { color: #94A3B8; font-size: 14px; line-height: 22px; margin-bottom: 24px; }
    .token-box { background-color: #090A0F; border: 1px solid #282D42; border-radius: 12px; padding: 16px; font-family: monospace; font-size: 14px; color: #38BDF8; word-break: break-all; text-align: center; margin-bottom: 24px; }
    .expiry-note { font-size: 12px; color: #64748B; margin-top: 8px; }
    .footer { font-size: 11px; color: #64748B; border-top: 1px solid #282D42; padding-top: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-badge">GYMDECK</div>
    <h1>Password Reset Request</h1>
    <p>We received a request to reset the password associated with your GymDeck account. Enter the authorization code below in your GymDeck app to set a new password:</p>
    <div class="token-box">
      ${resetToken}
      <div class="expiry-note">Valid for 15 minutes &bull; Single-use only</div>
    </div>
    <p>If you did not request this change, you can safely ignore this email. Your existing password will remain unchanged.</p>
    <div class="footer">
      &copy; ${new Date().getFullYear()} GymDeck Fitness Platform. All rights reserved.
    </div>
  </div>
</body>
</html>
  `;

  return { to: recipientEmail, subject, html, text };
}
