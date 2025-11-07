import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { calculateSupplyInfo, PrescriptionData } from './utils/supplyCalculator';
import { sendEmail, generateReorderEmailHTML } from './utils/emailService';
import { normalizeDate, dateDiffInDays } from './utils/dateUtils';

admin.initializeApp();

// Access the 'prescriptions' named database
// Note: If using a named database, ensure it's configured in Firebase project
const db = admin.firestore();

/**
 * Scheduled function that runs daily at 9 AM to check for prescriptions that need reordering
 */
export const checkReorderDates = functions.pubsub
  .schedule('0 9 * * *') // Runs daily at 9:00 AM UTC
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Starting reorder date check...');
    const today = normalizeDate(new Date());

    try {
      // Get all users from the prescriptions database
      const usersSnapshot = await db
        .collection('users')
        .get();

      if (usersSnapshot.empty) {
        console.log('No users found');
        return null;
      }

      let emailsSent = 0;
      let errors = 0;

      // Process each user
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();

        // Get user's email (from auth or user document)
        let userEmail: string | null = null;

        try {
          // Try to get email from auth
          const userRecord = await admin.auth().getUser(userId);
          userEmail = userRecord.email || null;
        } catch (error) {
          console.error(`Error getting user ${userId} from auth:`, error);
          // Try to get email from user document
          userEmail = userData.email || null;
        }

        if (!userEmail) {
          console.log(`No email found for user ${userId}, skipping...`);
          continue;
        }

        // Get all prescriptions for this user
        const prescriptionsSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('prescriptions')
          .get();

        if (prescriptionsSnapshot.empty) {
          continue;
        }

        const prescriptionsNeedingReorder: Array<{
          prescription: PrescriptionData;
          reorderDate: Date;
          runOutDate: Date;
          currentSupply: number;
        }> = [];

        // Check each prescription
        for (const prescriptionDoc of prescriptionsSnapshot.docs) {
          const prescriptionData = prescriptionDoc.data() as PrescriptionData;
          const supplyInfo = calculateSupplyInfo(prescriptionData);

          // Check if reorder date is today or in the past (and not already run out)
          const daysUntilReorder = dateDiffInDays(supplyInfo.reorderDate, today);
          const daysUntilRunOut = dateDiffInDays(supplyInfo.runOutDate, today);

          // Send email if:
          // 1. Reorder date is today or in the past
          // 2. Run out date is in the future (not already run out)
          // 3. Current supply is positive
          if (daysUntilReorder <= 0 && daysUntilRunOut > 0 && supplyInfo.currentSupply > 0) {
            prescriptionsNeedingReorder.push({
              prescription: prescriptionData,
              reorderDate: supplyInfo.reorderDate,
              runOutDate: supplyInfo.runOutDate,
              currentSupply: supplyInfo.currentSupply,
            });
          }
        }

        // Send email if there are prescriptions needing reorder
        if (prescriptionsNeedingReorder.length > 0) {
          try {
            // If multiple prescriptions, send one email with all of them
            if (prescriptionsNeedingReorder.length === 1) {
              const item = prescriptionsNeedingReorder[0];
              await sendEmail({
                to: userEmail,
                subject: `Reorder Reminder: ${item.prescription.name}`,
                html: generateReorderEmailHTML(
                  item.prescription.name,
                  item.reorderDate,
                  item.runOutDate,
                  item.currentSupply
                ),
              });
            } else {
              // Multiple prescriptions - create combined email
              const prescriptionsList = prescriptionsNeedingReorder
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

              const combinedHTML = `
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
                      <p>You have ${prescriptionsNeedingReorder.length} prescription(s) that need to be reordered:</p>
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

              await sendEmail({
                to: userEmail,
                subject: `Reorder Reminders: ${prescriptionsNeedingReorder.length} Prescription(s)`,
                html: combinedHTML,
              });
            }

            emailsSent++;
            console.log(`Email sent to ${userEmail} for ${prescriptionsNeedingReorder.length} prescription(s)`);
          } catch (error) {
            errors++;
            console.error(`Error sending email to ${userEmail}:`, error);
          }
        }
      }

      console.log(`Reorder check completed. Emails sent: ${emailsSent}, Errors: ${errors}`);
      return null;
    } catch (error) {
      console.error('Error in checkReorderDates function:', error);
      throw error;
    }
  });

