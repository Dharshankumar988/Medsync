import nodemailer from 'nodemailer';

interface SendResetEmailParams {
  toEmail: string;
  patientName?: string;
  resetLink: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string | null;
  error?: string;
}

/**
 * Creates and returns a configured Nodemailer transporter.
 * Supports:
 * 1. Environment SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, etc.)
 * 2. Gmail service (GMAIL_USER, GMAIL_APP_PASSWORD)
 * 3. Fallback: Ethereal Test Account (Zero domain / zero setup required)
 */
async function getEmailTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (gmailUser && gmailPass) {
    return {
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      }),
      fromEmail: `"MedSync Healthcare" <${gmailUser}>`,
      isTest: false,
    };
  }

  if (host && user && pass) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = port === 465;
    return {
      transporter: nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      }),
      fromEmail: process.env.SMTP_FROM || `"MedSync Healthcare" <${user}>`,
      isTest: false,
    };
  }

  // Fallback when user has no custom domain or SMTP server configured yet:
  // Nodemailer generates a real working test account via Ethereal!
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log('[MedSync Nodemailer] Using Ethereal test email account:', testAccount.user);
    return {
      transporter: nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      }),
      fromEmail: `"MedSync Healthcare" <${testAccount.user}>`,
      isTest: true,
    };
  } catch (err) {
    console.warn('[MedSync Nodemailer] Could not create Ethereal account, using stream transport:', err);
    return {
      transporter: nodemailer.createTransport({
        streamTransport: true,
        newline: 'windows',
      }),
      fromEmail: '"MedSync Healthcare" <no-reply@medsync.local>',
      isTest: true,
    };
  }
}

/**
 * Sends a password reset email to a patient with a secure one-time link.
 */
export async function sendPatientPasswordResetEmail({
  toEmail,
  patientName = 'Patient',
  resetLink,
}: SendResetEmailParams): Promise<SendEmailResult> {
  try {
    const { transporter, fromEmail, isTest } = await getEmailTransporter();

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your MedSync Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .body { padding: 32px 28px; line-height: 1.6; }
    .body h2 { font-size: 18px; color: #0f172a; margin-top: 0; }
    .btn-container { text-align: center; margin: 30px 0; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 600; text-decoration: none; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
    .callout { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; font-size: 13px; color: #64748b; margin-top: 24px; }
    .url-fallback { word-break: break-all; font-family: monospace; font-size: 12px; color: #2563eb; background: #eff6ff; padding: 8px; border-radius: 6px; margin-top: 8px; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; background-color: #fafafa; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MedSync</h1>
      <p>Secure Healthcare Ecosystem</p>
    </div>
    <div class="body">
      <h2>Hello ${patientName},</h2>
      <p>We received a request to reset the password for your MedSync Patient account associated with <strong>${toEmail}</strong>.</p>
      <p>Click the button below to choose a new password:</p>
      
      <div class="btn-container">
        <a href="${resetLink}" class="btn" target="_blank" rel="noopener noreferrer">Reset Password</a>
      </div>

      <div class="callout">
        <strong>Security Notice:</strong>
        <p style="margin: 4px 0 0;">This password reset link will expire in strictly <strong>5 minutes</strong>. If you did not request a password reset, you can safely ignore this email; your account remains secure.</p>
      </div>

      <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
        If the button above does not work, copy and paste this URL into your browser:
        <div class="url-fallback">${resetLink}</div>
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} MedSync. All rights reserved.<br>
      This is an automated system email. Please do not reply.
    </div>
  </div>
</body>
</html>
    `;

    const info = await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject: 'Reset Your MedSync Password (Valid for 5 Minutes)',
      text: `Hello ${patientName},\n\nYou requested a password reset for your MedSync Patient account. Visit this link to reset your password:\n\n${resetLink}\n\nThis link strictly expires in 5 minutes. If you did not request this, please ignore this email.`,
      html: htmlContent,
    });

    let previewUrl: string | null = null;
    if (isTest && (transporter as any).options?.host?.includes('ethereal')) {
      previewUrl = nodemailer.getTestMessageUrl(info) || null;
      console.log('====================================================');
      console.log('[MedSync Nodemailer] Password reset email sent!');
      console.log(`[MedSync Nodemailer] Recipient: ${toEmail}`);
      console.log(`[MedSync Nodemailer] Reset Link: ${resetLink}`);
      if (previewUrl) {
        console.log(`[MedSync Nodemailer] Preview URL: ${previewUrl}`);
      }
      console.log('====================================================');
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
    };
  } catch (err: any) {
    console.error('[MedSync Nodemailer] Failed to send email:', err);
    return {
      success: false,
      error: err.message || 'Failed to send password reset email',
    };
  }
}
