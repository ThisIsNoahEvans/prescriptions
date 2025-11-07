import * as nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Creates a nodemailer transporter.
 * Configure with your email service (Gmail, SendGrid, etc.)
 */
function createTransporter() {
  const functions = require('firebase-functions');
  const config = functions.config();

  const emailService = config.email?.service || process.env.EMAIL_SERVICE || 'gmail';

  // Option 1: Gmail SMTP
  // You'll need to generate an App Password in your Google Account settings
  if (emailService === 'gmail') {
    const emailUser = config.email?.user || process.env.EMAIL_USER;
    const emailPassword = config.email?.app_password || process.env.EMAIL_APP_PASSWORD;

    if (!emailUser || !emailPassword) {
      throw new Error('Gmail configuration missing: EMAIL_USER and EMAIL_APP_PASSWORD required');
    }

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword, // Use App Password, not regular password
      },
    });
  }

  // Option 2: SendGrid SMTP
  if (emailService === 'sendgrid') {
    const apiKey = config.sendgrid?.api_key || process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      throw new Error('SendGrid configuration missing: SENDGRID_API_KEY required');
    }

    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: apiKey,
      },
    });
  }

  // Option 3: Custom SMTP
  const smtpHost = config.smtp?.host || process.env.SMTP_HOST;
  const smtpPort = config.smtp?.port || process.env.SMTP_PORT || '587';
  const smtpSecure = config.smtp?.secure === 'true' || process.env.SMTP_SECURE === 'true';
  const smtpUser = config.smtp?.user || process.env.SMTP_USER;
  const smtpPassword = config.smtp?.password || process.env.SMTP_PASSWORD;

  if (!smtpHost || !smtpUser || !smtpPassword) {
    throw new Error('Custom SMTP configuration missing: SMTP_HOST, SMTP_USER, and SMTP_PASSWORD required');
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort),
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });
}

/**
 * Sends an email using nodemailer
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const functions = require('firebase-functions');
  const config = functions.config();

  const transporter = createTransporter();
  const from =
    config.email?.from ||
    process.env.EMAIL_FROM ||
    config.email?.user ||
    process.env.EMAIL_USER ||
    'noreply@prescriptiontracker.com';

  await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}

/**
 * Generates HTML email template for reorder reminder
 */
export function generateReorderEmailHTML(
  prescriptionName: string,
  reorderDate: Date,
  runOutDate: Date,
  currentSupply: number
): string {
  const reorderDateStr = reorderDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const runOutDateStr = runOutDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #2563eb;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .alert {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
        }
        .info-box {
          background-color: white;
          padding: 15px;
          margin: 15px 0;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
        }
        .button {
          display: inline-block;
          background-color: #2563eb;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Prescription Reorder Reminder</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>This is a reminder that you need to reorder your prescription:</p>
          
          <div class="info-box">
            <h2 style="margin-top: 0;">${prescriptionName}</h2>
            <p><strong>Current Supply:</strong> ~${Math.round(currentSupply)} tablets</p>
            <p><strong>Reorder Date:</strong> ${reorderDateStr}</p>
            <p><strong>Estimated Run Out Date:</strong> ${runOutDateStr}</p>
          </div>
          
          <div class="alert">
            <strong>⚠️ Action Required:</strong> Please place your order by ${reorderDateStr} to ensure you don't run out of medication.
          </div>
          
          <p>Thank you for using Prescription Tracker!</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

