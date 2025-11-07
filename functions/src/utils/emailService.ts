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
 * Generates HTML email template for a single prescription reorder reminder
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

/**
 * Generates HTML email template for multiple prescription reorder reminders
 */
export function generateCombinedReorderEmailHTML(
  prescriptions: PrescriptionReorderItem[]
): string {
  const prescriptionsList = prescriptions
    .map(
      (item) => `
      <div class="info-box">
        <h3 style="margin-top: 0;">${item.prescription.name}</h3>
        <p><strong>Current Supply:</strong> ~${Math.round(item.currentSupply)} tablets</p>
        <p><strong>Reorder Date:</strong> ${item.reorderDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}</p>
        <p><strong>Estimated Run Out Date:</strong> ${item.runOutDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}</p>
      </div>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .alert { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .info-box { background-color: white; padding: 15px; margin: 15px 0; border-radius: 4px; border: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Prescription Reorder Reminders</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>You have ${prescriptions.length} prescription(s) that need to be reordered:</p>
          ${prescriptionsList}
          <div class="alert">
            <strong>⚠️ Action Required:</strong> Please place your orders to ensure you don't run out of medication.
          </div>
          <p>Thank you for using Prescription Tracker!</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

