/**
 * Email service utilities for generating HTML email templates.
 *
 * Note: This app uses the Firebase Extension 'firestore-send-email' to send emails.
 * Instead of sending emails directly via SMTP, we add documents to the 'mail' collection
 * in Firestore, and the extension automatically sends them.
 *
 * See: https://firebase.google.com/docs/extensions/official/firestore-send-email
 */

interface PrescriptionReorderItem {
  prescription: {
    name: string;
  };
  runOutDate: Date;
  currentSupply: number;
  thresholdDays: number; // Days before run out date
}

interface PrescriptionRunOutItem {
  prescription: {
    name: string;
  };
  runOutDate: Date;
  currentSupply: number;
}

/**
 * Returns the common CSS styles used in all email templates
 */
function getEmailStyles(): string {
  return `
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          background-color: #f3f4f6;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          padding: 0;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff;
          padding: 32px 24px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .greeting {
          font-size: 18px;
          color: #1f2937;
          margin: 24px 24px 16px 24px;
        }
        .intro-text {
          font-size: 16px;
          color: #4b5563;
          line-height: 1.6;
          margin: 0 24px 24px 24px;
        }
        .card {
          background-color: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin: 0 24px 16px 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .prescription-name {
          font-size: 22px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 16px 0;
        }
        .info-row {
          display: table;
          width: 100%;
          margin-bottom: 12px;
        }
        .info-label {
          display: table-cell;
          font-weight: 600;
          color: #374151;
          padding-right: 8px;
          white-space: nowrap;
          vertical-align: top;
        }
        .info-value {
          display: table-cell;
          color: #1f2937;
          vertical-align: top;
        }
        .alert-box {
          background-color: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 16px;
          margin: 0 24px 24px 24px;
        }
        .alert-text {
          margin: 0;
          color: #991b1b;
          font-size: 14px;
          line-height: 1.5;
        }
        .info-box {
          background-color: #dbeafe;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 16px;
          margin: 0 24px 24px 24px;
        }
        .info-text {
          margin: 0;
          color: #1e40af;
          font-size: 14px;
          line-height: 1.5;
        }
        .button {
          display: inline-block;
          background-color: #2563eb;
          color: #ffffff !important;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          transition: background-color 0.2s;
        }
        .button:hover {
          background-color: #1d4ed8;
        }
        .footer {
          background-color: #f9fafb;
          padding: 24px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
          margin-top: 32px;
        }
        .footer p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }
      `;
}

/**
 * Generates HTML email template for a single prescription reorder reminder
 * Styled to match the React web app design
 */
export function generateReorderEmailHTML(
  userName: string,
  prescriptionName: string,
  runOutDate: Date,
  currentSupply: number,
  thresholdDays: number
): string {
  const runOutDateStr = runOutDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const today = new Date();
  const daysUntilRunOut = Math.ceil(
    (runOutDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  let urgencyColor = "#1f2937"; // gray-800
  let urgencyLabel = "";

  if (daysUntilRunOut < 0) {
    urgencyColor = "#dc2626"; // red-600
    urgencyLabel = `(Overdue by ${Math.abs(daysUntilRunOut)} days)`;
  } else if (daysUntilRunOut === 0) {
    urgencyColor = "#dc2626"; // red-600
    urgencyLabel = "(Run out today!)";
  } else if (daysUntilRunOut <= 7) {
    urgencyColor = "#ca8a04"; // yellow-600
    urgencyLabel = `(In ${daysUntilRunOut} days)`;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        ${getEmailStyles()}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reorder Reminder</h1>
        </div>
        
        <p class="greeting">Hi ${userName},</p>
        
        <p class="intro-text">
          This is a reminder that your prescription <strong>${prescriptionName}</strong> needs to be reordered soon.
        </p>
        
        <div class="card">
          <h2 class="prescription-name">${prescriptionName}</h2>
          
          <div class="info-row">
            <span class="info-label">Current Supply: </span>
            <span class="info-value">~${Math.round(
              currentSupply
            )} tablets</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Estimated Run Out Date:</span>
            <span class="info-value" style="color: ${urgencyColor};">${runOutDateStr} ${urgencyLabel}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Reminder:</span>
            <span class="info-value">${thresholdDays} day${thresholdDays !== 1 ? 's' : ''} before run out date</span>
          </div>
        </div>
        
        <div class="alert-box">
          <p class="alert-text">
            <strong>⚠️ Action Required:</strong> Your prescription will run out in ${daysUntilRunOut} day${daysUntilRunOut !== 1 ? 's' : ''}. Please place your order soon to ensure you don't run out of medication.
          </p>
        </div>
        
        <div class="info-box">
          <p class="info-text">
            📦 <strong>Don't forget:</strong> After you receive your medication, log the delivery in Prescription Tracker to keep your supply calculations accurate!
          </p>
        </div>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="https://prescriptions.itsnoahevans.co.uk" class="button" style="color: #ffffff !important; text-decoration: none;">Log in to Prescription Tracker</a>
        </div>
        
        <div class="footer">
          <p>Thank you for using Prescription Tracker!</p>
          <p style="margin-top: 12px; font-size: 14px;">
            <a href="https://prescriptions.itsnoahevans.co.uk" style="color: #2563eb; text-decoration: none; margin-right: 16px;">prescriptions.itsnoahevans.co.uk</a>
            <a href="mailto:support@itsnoahevans.co.uk" style="color: #2563eb; text-decoration: none;">Support</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generates HTML email template for multiple prescription reorder reminders
 * Styled to match the React web app design
 */
export function generateCombinedReorderEmailHTML(
  userName: string,
  prescriptions: PrescriptionReorderItem[]
): string {
  const today = new Date();

  const prescriptionsList = prescriptions
    .map((item) => {
      const runOutDateStr = item.runOutDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const daysUntilRunOut = Math.ceil(
        (item.runOutDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      let urgencyColor = "#1f2937"; // gray-800
      let urgencyLabel = "";

      if (daysUntilRunOut < 0) {
        urgencyColor = "#dc2626"; // red-600
        urgencyLabel = `(Overdue by ${Math.abs(daysUntilRunOut)} days)`;
      } else if (daysUntilRunOut === 0) {
        urgencyColor = "#dc2626"; // red-600
        urgencyLabel = "(Run out today!)";
      } else if (daysUntilRunOut <= 7) {
        urgencyColor = "#ca8a04"; // yellow-600
        urgencyLabel = `(In ${daysUntilRunOut} days)`;
      }

      return `
        <div class="card">
          <h2 class="prescription-name">${item.prescription.name}</h2>
          
          <div class="info-row">
            <span class="info-label">Current Supply: </span>
            <span class="info-value"> ~${Math.round(
              item.currentSupply
            )} tablets</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Estimated Run Out Date:</span>
            <span class="info-value" style="color: ${urgencyColor};">${runOutDateStr} ${urgencyLabel}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Reminder:</span>
            <span class="info-value">${item.thresholdDays} day${item.thresholdDays !== 1 ? 's' : ''} before run out date</span>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        ${getEmailStyles()}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reorder Reminders</h1>
        </div>
        
        <p class="greeting">Hi ${userName},</p>
        
        <p class="intro-text">
          You have <strong>${prescriptions.length}</strong> prescription${prescriptions.length !== 1 ? 's' : ''} that need${prescriptions.length === 1 ? 's' : ''} to be reordered soon.
        </p>
        
        ${prescriptionsList}
        
        <div class="alert-box">
          <p class="alert-text">
            <strong>⚠️ Action Required:</strong> Please place your orders soon to ensure you don't run out of medication.
          </p>
        </div>
        
        <div class="info-box">
          <p class="info-text">
            📦 <strong>Don't forget:</strong> After you receive your medication, log the delivery in Prescription Tracker to keep your supply calculations accurate!
          </p>
        </div>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="https://prescriptions.itsnoahevans.co.uk" class="button" style="color: #ffffff !important; text-decoration: none;">Log in to Prescription Tracker</a>
        </div>
        
        <div class="footer">
          <p>Thank you for using Prescription Tracker!</p>
          <p style="margin-top: 12px; font-size: 14px;">
            <a href="https://prescriptions.itsnoahevans.co.uk" style="color: #2563eb; text-decoration: none; margin-right: 16px;">prescriptions.itsnoahevans.co.uk</a>
            <a href="mailto:support@itsnoahevans.co.uk" style="color: #2563eb; text-decoration: none;">Support</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generates HTML email template for run-out day reminder
 * Reminds user to log delivery if they haven't already
 */
export function generateRunOutDayReminderHTML(
  userName: string,
  prescriptions: PrescriptionRunOutItem[]
): string {
  const prescriptionsList = prescriptions
    .map((item) => {
      const runOutDateStr = item.runOutDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      return `
        <div class="card">
          <h2 class="prescription-name">${item.prescription.name}</h2>
          
          <div class="info-row">
            <span class="info-label">Run Out Date:</span>
            <span class="info-value" style="color: #dc2626;">${runOutDateStr} (Today!)</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Current Supply:</span>
            <span class="info-value">~${Math.round(item.currentSupply)} tablets</span>
          </div>
        </div>
      `;
    })
    .join("");

  const prescriptionNames = prescriptions.map(p => p.prescription.name).join(", ");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        ${getEmailStyles()}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Run Out Day Reminder</h1>
        </div>
        
        <p class="greeting">Hi ${userName},</p>
        
        <p class="intro-text">
          ${prescriptions.length === 1 
            ? `Your prescription <strong>${prescriptionNames}</strong> is running out today.`
            : `You have ${prescriptions.length} prescriptions running out today.`
          }
        </p>
        
        ${prescriptionsList}
        
        <div class="alert-box" style="background-color: #fef3c7; border-color: #f59e0b;">
          <p class="alert-text" style="color: #92400e;">
            <strong>📦 Important:</strong> If you've received your medication, please log the delivery in Prescription Tracker to keep your supply calculations accurate!
          </p>
        </div>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="https://prescriptions.itsnoahevans.co.uk" class="button" style="color: #ffffff !important; text-decoration: none;">Log in to Prescription Tracker</a>
        </div>
        
        <div class="footer">
          <p>Thank you for using Prescription Tracker!</p>
          <p style="margin-top: 12px; font-size: 14px;">
            <a href="https://prescriptions.itsnoahevans.co.uk" style="color: #2563eb; text-decoration: none; margin-right: 16px;">prescriptions.itsnoahevans.co.uk</a>
            <a href="mailto:support@itsnoahevans.co.uk" style="color: #2563eb; text-decoration: none;">Support</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
