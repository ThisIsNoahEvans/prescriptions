import { getFirebaseDb } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface UserSettings {
  defaultEmailThresholds?: number[]; // Array of days before run out date (e.g., [10, 5])
}

const DEFAULT_EMAIL_THRESHOLDS = [10]; // Default to 10 days

/**
 * Get user settings from Firestore
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  const db = getFirebaseDb();
  const settingsRef = doc(db, 'users', userId, 'settings', 'email');
  
  try {
    const settingsDoc = await getDoc(settingsRef);
    if (settingsDoc.exists()) {
      return settingsDoc.data() as UserSettings;
    }
    // Return default settings if none exist
    return {
      defaultEmailThresholds: DEFAULT_EMAIL_THRESHOLDS,
    };
  } catch (error) {
    console.error('Error getting user settings:', error);
    // Return default settings on error
    return {
      defaultEmailThresholds: DEFAULT_EMAIL_THRESHOLDS,
    };
  }
}

/**
 * Update user settings in Firestore
 */
export async function updateUserSettings(
  userId: string,
  settings: Partial<UserSettings>
): Promise<void> {
  const db = getFirebaseDb();
  const settingsRef = doc(db, 'users', userId, 'settings', 'email');
  
  await setDoc(settingsRef, settings, { merge: true });
}

