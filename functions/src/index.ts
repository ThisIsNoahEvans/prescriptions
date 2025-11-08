import * as scheduler from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { calculateSupplyInfo, PrescriptionData } from './utils/supplyCalculator';
import { generateReorderEmailHTML, generateCombinedReorderEmailHTML } from './utils/emailService';
import { normalizeDate, dateDiffInDays } from './utils/dateUtils';
import sgMail from '@sendgrid/mail';

admin.initializeApp()

// Access the prescriptions database
const db = getFirestore("prescriptions")

/**
 * Scheduled function that runs daily at 9 AM to check for prescriptions that need reordering
 * 
 * To set secrets, run:
 * firebase functions:secrets:set SENDGRID_API_KEY
 * firebase functions:secrets:set SENDGRID_FROM_EMAIL
 */
export const checkReorderDates = scheduler.onSchedule(
  {
    schedule: '0 9 * * *', // Runs daily at 9:00 AM UTC
    timeZone: 'UTC',
    secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'],
  },
  async () => {
    // Initialize SendGrid with secret value
    // Secrets are automatically available in process.env when declared in secrets array
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendgridApiKey) {
      throw new Error('SENDGRID_API_KEY secret is not set');
    }
    sgMail.setApiKey(sendgridApiKey);
    console.log('Starting reorder date check...');
    const today = normalizeDate(new Date());

    try {
      // Use collection group query to find all prescriptions across all users
      // This works even if user documents don't exist (only subcollections exist)
      console.log('Querying prescriptions collection group...');
      const prescriptionsGroupSnapshot = await db
        .collectionGroup('prescriptions')
        .get();

      console.log(`Found ${prescriptionsGroupSnapshot.size} prescriptions total`);

      if (prescriptionsGroupSnapshot.empty) {
        console.log('No prescriptions found');
        return;
      }

      // Extract unique user IDs from prescription paths
      // Path format: users/{userId}/prescriptions/{prescriptionId}
      const userIds = new Set<string>();
      for (const doc of prescriptionsGroupSnapshot.docs) {
        const pathParts = doc.ref.path.split('/');
        // Path should be: users/{userId}/prescriptions/{prescriptionId}
        if (pathParts.length >= 2 && pathParts[0] === 'users') {
          userIds.add(pathParts[1]);
        }
      }

      console.log(`Found ${userIds.size} unique users with prescriptions`);

      if (userIds.size === 0) {
        console.log('No users found');
        return;
      }

      let emailsSent = 0;
      let errors = 0;

      // Process each user
      for (const userId of userIds) {
        // Get user's email from Auth
        let userEmail: string | null = null;

        try {
          const userRecord = await admin.auth().getUser(userId);
          userEmail = userRecord.email || null;
        } catch (error) {
          console.error(`Error getting user ${userId} from auth:`, error);
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
          console.log(`Sending email to ${userEmail} for ${prescriptionsNeedingReorder.length} prescription(s)`);
          try {
            let subject: string;
            let html: string;

            // If multiple prescriptions, send one email with all of them
            if (prescriptionsNeedingReorder.length === 1) {
              const item = prescriptionsNeedingReorder[0];
              subject = `Reorder Reminder: ${item.prescription.name}`;
              html = generateReorderEmailHTML(
                item.prescription.name,
                item.reorderDate,
                item.runOutDate,
                item.currentSupply
              );
            } else {
              // Multiple prescriptions - create combined email
              subject = `Reorder Reminders: ${prescriptionsNeedingReorder.length} Prescription(s)`;
              html = generateCombinedReorderEmailHTML(prescriptionsNeedingReorder);
            }

            
            const msg = {
              to: userEmail,
              from: 'noreply@itsnoahevans.co.uk', // Change to your verified sender
              subject: subject,
              text: subject, // Plain text version (you can enhance this)
              html: html,
            };

            await sgMail.send(msg);

            emailsSent++;
            console.log(`Email sent to ${userEmail} for ${prescriptionsNeedingReorder.length} prescription(s)`);
          } catch (error) {
            errors++;
            console.error(`Error sending email to ${userEmail}:`, error);
            if (error instanceof Error) {
              console.error('Error details:', error.message);
            }
          }
        }
      }

      console.log(`Reorder check completed. Emails sent: ${emailsSent}, Errors: ${errors}`);
    } catch (error) {
      console.error('Error in checkReorderDates function:', error);
      throw error;
    }
  });

