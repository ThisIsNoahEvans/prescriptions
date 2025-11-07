import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { calculateSupplyInfo, PrescriptionData } from './utils/supplyCalculator';
import { generateReorderEmailHTML, generateCombinedReorderEmailHTML } from './utils/emailService';
import { normalizeDate, dateDiffInDays } from './utils/dateUtils';

admin.initializeApp();

// Access the default Firestore database
// The 'prescriptions' named database is accessed via the client SDK
// For Cloud Functions, we use the default database
const db = admin.firestore();

/**
 * Scheduled function that runs daily at 9 AM to check for prescriptions that need reordering
 */
export const checkReorderDates = functions.pubsub
  .schedule('0 9 * * *') // Runs daily at 9:00 AM UTC
  .timeZone('UTC')
  .onRun(async () => {
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
        // Use Firestore-send-email extension by adding document to 'mail' collection
        if (prescriptionsNeedingReorder.length > 0) {
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

            // Add email document to Firestore 'mail' collection
            // The firestore-send-email extension will automatically send it
            await db.collection('mail').add({
              to: userEmail,
              message: {
                subject: subject,
                html: html,
              },
            });

            emailsSent++;
            console.log(`Email queued for ${userEmail} for ${prescriptionsNeedingReorder.length} prescription(s)`);
          } catch (error) {
            errors++;
            console.error(`Error queuing email for ${userEmail}:`, error);
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

