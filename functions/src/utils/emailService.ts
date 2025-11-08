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
  reorderDate: Date;
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
          line-height: 1.6;
          color: #111827;
        }
        .email-container {
          max-width: 672px;
          margin: 0 auto;
          padding: 32px 16px;
        }
        .header {
          margin-bottom: 32px;
        }
        .header h1 {
          font-size: 32px;
          font-weight: 700;
          color: #1e40af;
          margin: 0 0 8px 0;
        }
        .header p {
          font-size: 16px;
          color: #4b5563;
          margin: 0;
        }
        .card {
          background-color: #ffffff;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #e5e7eb;
          margin-bottom: 24px;
        }
        .card:last-child {
          margin-bottom: 0;
        }
        .prescription-name {
          font-size: 30px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 16px 0;
        }
        .info-row {
          display: table;
          width: 100%;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
          display: table-cell;
          width: 50%;
          padding-right: 16px;
        }
        .info-value {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          display: table-cell;
          width: 50%;
          text-align: right;
        }
        .reorder-date {
          font-weight: 700;
        }
        .alert-box {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 16px;
          border-radius: 8px;
          margin: 24px 0;
        }
        .alert-text {
          font-size: 14px;
          color: #92400e;
          margin: 0;
        }
        .info-box {
          background-color: #eff6ff;
          border-left: 4px solid #3b82f6;
          padding: 16px;
          border-radius: 8px;
          margin: 24px 0;
        }
        .info-text {
          font-size: 14px;
          color: #1e40af;
          margin: 0;
        }
        .button {
          display: inline-block;
          background-color: #2563eb;
          color: #ffffff !important;
          font-weight: 700;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 8px;
          margin: 24px 0;
          text-align: center;
          font-size: 16px;
        }
        .button:hover {
          background-color: #1d4ed8;
          color: #ffffff !important;
        }
        a.button {
          color: #ffffff !important;
        }
        .footer {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
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
  reorderDate: Date,
  runOutDate: Date,
  currentSupply: number
): string {
  const reorderDateStr = reorderDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const runOutDateStr = runOutDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const today = new Date();
  const daysUntilReorder = Math.ceil(
    (reorderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  let urgencyColor = "#1f2937"; // gray-800
  let urgencyLabel = "";

  if (daysUntilReorder < 0) {
    urgencyColor = "#dc2626"; // red-600
    urgencyLabel = `(Overdue by ${Math.abs(daysUntilReorder)} days)`;
  } else if (daysUntilReorder === 0) {
    urgencyColor = "#dc2626"; // red-600
    urgencyLabel = "(Order Today!)";
  } else if (daysUntilReorder <= 7) {
    urgencyColor = "#ca8a04"; // yellow-600
    urgencyLabel = `(In ${daysUntilReorder} days)`;
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
      <div class="email-container">
        <div class="header">
          <h1>My Prescription Tracker</h1>
          <p>Never miss a re-order date again.</p>
        </div>
        
        <p style="font-size: 16px; color: #111827; margin-bottom: 8px;">
          Hi ${userName},
        </p>
        
        <p style="font-size: 16px; color: #111827; margin-bottom: 24px;">
          This is a reminder that you need to reorder your prescription:
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
            <span class="info-label">Reorder Date: </span>
            <span class="info-value reorder-date" style="color: ${urgencyColor};">${reorderDateStr} ${urgencyLabel}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Estimated Run Out Date:</span>
            <span class="info-value">${runOutDateStr}</span>
          </div>
        </div>
        
        <div class="alert-box">
          <p class="alert-text">
            <strong>⚠️ Action Required:</strong> Please place your order by ${reorderDateStr} to ensure you don't run out of medication.
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
      const reorderDateStr = item.reorderDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const runOutDateStr = item.runOutDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const daysUntilReorder = Math.ceil(
        (item.reorderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      let urgencyColor = "#1f2937"; // gray-800
      let urgencyLabel = "";

      if (daysUntilReorder < 0) {
        urgencyColor = "#dc2626"; // red-600
        urgencyLabel = `(Overdue by ${Math.abs(daysUntilReorder)} days)`;
      } else if (daysUntilReorder === 0) {
        urgencyColor = "#dc2626"; // red-600
        urgencyLabel = "(Order Today!)";
      } else if (daysUntilReorder <= 7) {
        urgencyColor = "#ca8a04"; // yellow-600
        urgencyLabel = `(In ${daysUntilReorder} days)`;
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
            <span class="info-label">Reorder Date: </span>
            <span class="info-value reorder-date" style="color: ${urgencyColor};"> ${reorderDateStr} ${urgencyLabel}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Estimated Run Out Date:</span>
            <span class="info-value">${runOutDateStr}</span>
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
      <div class="email-container">
        <div class="header">
          <h1>My Prescription Tracker</h1>
          <p>Never miss a re-order date again.</p>
        </div>
        
        <p style="font-size: 16px; color: #111827; margin-bottom: 8px;">
          Hi ${userName},
        </p>
        
        <p style="font-size: 16px; color: #111827; margin-bottom: 24px;">
          You have <strong>${prescriptions.length}</strong> prescription(s) that need to be reordered:
        </p>
        
        ${prescriptionsList}
        
        <div class="alert-box">
          <p class="alert-text">
            <strong>⚠️ Action Required:</strong> Please place your orders to ensure you don't run out of medication.
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
