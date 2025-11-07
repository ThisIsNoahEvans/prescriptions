import { getFirebaseDb, getFirebaseStorage } from '../firebase/config';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { deletePrescriptionPhoto } from './storageService';

/**
 * Delete all user data from Firestore and Storage
 * This includes prescriptions, categories, and all associated photos
 */
export async function deleteAllUserData(userId: string): Promise<void> {
  const db = getFirebaseDb();
  const storage = getFirebaseStorage();

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

  // Delete all photos from Storage (cleanup any orphaned files)
  try {
    const photosRef = ref(storage, `prescriptions/${userId}`);
    const photosList = await listAll(photosRef);
    
    for (const photoRef of photosList.items) {
      try {
        await deleteObject(photoRef);
      } catch (error) {
        console.error('Error deleting photo from storage:', error);
        // Continue even if photo deletion fails
      }
    }
  } catch (error) {
    // If the folder doesn't exist, that's fine
    console.log('No photos folder found or already deleted');
  }
}

