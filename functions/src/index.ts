import * as scheduler from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { calculateSupplyInfo, PrescriptionData } from './utils/supplyCalculator';
import { generateReorderEmailHTML, generateCombinedReorderEmailHTML, generateRunOutDayReminderHTML } from './utils/emailService';
import { normalizeDate, dateDiffInDays, addDays } from './utils/dateUtils';
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
        // Get user's email and display name from Auth
        let userEmail: string | null = null;
        let userName: string | null = null;

        try {
          const userRecord = await admin.auth().getUser(userId);
          userEmail = userRecord.email || null;
          userName = userRecord.displayName || userRecord.email?.split('@')[0] || null;
        } catch (error) {
          console.error(`Error getting user ${userId} from auth:`, error);
        }

        if (!userEmail) {
          console.log(`No email found for user ${userId}, skipping...`);
          continue;
        }

        // Get user settings for default thresholds
        let defaultThresholds: number[] = [10]; // Default to 10 days
        try {
          const settingsDoc = await db
            .collection('users')
            .doc(userId)
            .collection('settings')
            .doc('email')
            .get();
          if (settingsDoc.exists) {
            const settings = settingsDoc.data();
            if (settings?.defaultEmailThresholds && Array.isArray(settings.defaultEmailThresholds)) {
              defaultThresholds = settings.defaultEmailThresholds;
            }
          }
        } catch (error) {
          console.error(`Error getting user settings for ${userId}:`, error);
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
          runOutDate: Date;
          currentSupply: number;
          thresholdDays: number; // Which threshold triggered this email
        }> = [];

        const prescriptionsRunOutToday: Array<{
          prescription: PrescriptionData;
          runOutDate: Date;
          currentSupply: number;
        }> = [];

        // Check each prescription
        for (const prescriptionDoc of prescriptionsSnapshot.docs) {
          const prescriptionData = prescriptionDoc.data() as PrescriptionData;
          const supplyInfo = calculateSupplyInfo(prescriptionData);

          // Normalize run out date for comparison
          const normalizedRunOutDate = normalizeDate(supplyInfo.runOutDate);
          
          // Check if run out date is today (compare normalized dates directly)
          const runOutDateStr = normalizedRunOutDate.toISOString().split('T')[0];
          const todayStr = today.toISOString().split('T')[0];
          const isRunOutToday = runOutDateStr === todayStr;
          
          // Check if run out date is in the past (more than today)
          const isRunOutInPast = normalizedRunOutDate < today;

          // Check if run out date is today and no delivery logged
          // We check this BEFORE checking supply, because even if supply is 0,
          // the user might have received a delivery but not logged it yet
          if (isRunOutToday) {
            // Check if there's a delivery logged today
            const hasDeliveryToday = prescriptionData.supplyLog.some((log) => {
              const logDate = normalizeDate(log.date.toDate());
              const logDateStr = logDate.toISOString().split('T')[0];
              return logDateStr === todayStr;
            });

            if (!hasDeliveryToday) {
              prescriptionsRunOutToday.push({
                prescription: prescriptionData,
                runOutDate: supplyInfo.runOutDate,
                currentSupply: supplyInfo.currentSupply,
              });
            }
            continue; // Don't check thresholds if running out today
          }

          // Skip if already run out (in the past) or no supply
          if (isRunOutInPast || supplyInfo.currentSupply <= 0) {
            continue;
          }

          // Get thresholds for this prescription (custom or default)
          const thresholds = prescriptionData.emailThresholds && prescriptionData.emailThresholds.length > 0
            ? prescriptionData.emailThresholds
            : defaultThresholds;

          // Check each threshold
          for (const thresholdDays of thresholds) {
            const thresholdDate = addDays(supplyInfo.runOutDate, -thresholdDays);
            const daysUntilThreshold = dateDiffInDays(thresholdDate, today);

            // Send email if threshold date is today or in the past
            if (daysUntilThreshold <= 0) {
              // Check if we already have this prescription in the list
              const existingIndex = prescriptionsNeedingReorder.findIndex(
                (p) => p.prescription.id === prescriptionData.id
              );

              if (existingIndex === -1) {
                // Add new prescription
                prescriptionsNeedingReorder.push({
                  prescription: prescriptionData,
                  runOutDate: supplyInfo.runOutDate,
                  currentSupply: supplyInfo.currentSupply,
                  thresholdDays,
                });
              } else {
                // Update to use the earliest threshold (most urgent)
                if (thresholdDays < prescriptionsNeedingReorder[existingIndex].thresholdDays) {
                  prescriptionsNeedingReorder[existingIndex].thresholdDays = thresholdDays;
                }
              }
              break; // Only send one email per prescription per day, use the most urgent threshold
            }
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
                userName || 'there',
                item.prescription.name,
                item.runOutDate,
                item.currentSupply,
                item.thresholdDays
              );
            } else {
              // Multiple prescriptions - create combined email
              subject = `Reorder Reminders: ${prescriptionsNeedingReorder.length} Prescription(s)`;
              html = generateCombinedReorderEmailHTML(
                userName || 'there',
                prescriptionsNeedingReorder
              );
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

        // Send run-out day reminder email if there are prescriptions running out today
        if (prescriptionsRunOutToday.length > 0) {
          console.log(`Sending run-out day reminder to ${userEmail} for ${prescriptionsRunOutToday.length} prescription(s)`);
          try {
            const subject = prescriptionsRunOutToday.length === 1
              ? `Run Out Day Reminder: ${prescriptionsRunOutToday[0].prescription.name}`
              : `Run Out Day Reminders: ${prescriptionsRunOutToday.length} Prescription(s)`;
            
            const html = generateRunOutDayReminderHTML(
              userName || 'there',
              prescriptionsRunOutToday
            );

            const msg = {
              to: userEmail,
              from: 'noreply@itsnoahevans.co.uk',
              subject: subject,
              text: subject,
              html: html,
            };

            await sgMail.send(msg);

            emailsSent++;
            console.log(`Run-out day reminder sent to ${userEmail} for ${prescriptionsRunOutToday.length} prescription(s)`);
          } catch (error) {
            errors++;
            console.error(`Error sending run-out day reminder to ${userEmail}:`, error);
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

