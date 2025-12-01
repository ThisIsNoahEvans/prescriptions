import { getFirebaseDb } from '../firebase/config';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { deletePrescriptionPhoto } from './storageService';

/**
 * Delete all user data from Firestore and Storage
 * This includes prescriptions, categories, and all associated photos
 */
export async function deleteAllUserData(userId: string): Promise<void> {
  const db = getFirebaseDb();

  // Delete all prescriptions
  const prescriptionsRef = collection(db, 'users', userId, 'prescriptions');
  const prescriptionsSnapshot = await getDocs(prescriptionsRef);
  
  for (const prescriptionDoc of prescriptionsSnapshot.docs) {
    const prescriptionData = prescriptionDoc.data();
    
    // Delete all photos for this prescription
    if (prescriptionData.photoUrls && Array.isArray(prescriptionData.photoUrls)) {
      for (const photoUrl of prescriptionData.photoUrls) {
        try {
          await deletePrescriptionPhoto(photoUrl);
        } catch (error) {
          console.error('Error deleting photo:', error);
          // Continue even if photo deletion fails
        }
      }
    }
    
    // Delete the prescription document
    await deleteDoc(doc(db, 'users', userId, 'prescriptions', prescriptionDoc.id));
  }

  // Delete all categories
  const categoriesRef = collection(db, 'users', userId, 'categories');
  const categoriesSnapshot = await getDocs(categoriesRef);
  
  for (const categoryDoc of categoriesSnapshot.docs) {
    await deleteDoc(doc(db, 'users', userId, 'categories', categoryDoc.id));
  }

  // Note: We don't need to cleanup orphaned files in Storage because:
  // 1. We've already deleted all photos individually from prescriptions above
  // 2. Storage rules don't allow listing at the folder level (only individual files)
  // 3. Any truly orphaned files will be cleaned up by Firebase Storage lifecycle rules if configured
}

