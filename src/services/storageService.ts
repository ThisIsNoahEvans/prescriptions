import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirebaseStorage } from '../firebase/config';

/**
 * Upload a photo to Firebase Storage for a prescription
 * @param userId - The user's ID
 * @param prescriptionId - The prescription's ID
 * @param file - The image file to upload
 * @returns The download URL of the uploaded photo
 */
export async function uploadPrescriptionPhoto(
  userId: string,
  prescriptionId: string,
  file: File
): Promise<string> {
  const storage = getFirebaseStorage();
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }
  
  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('Image size must be less than 5MB');
  }
  
  // Create a unique filename with timestamp
  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name}`;
  const storageRef = ref(storage, `prescriptions/${userId}/${prescriptionId}/${fileName}`);
  
  // Upload the file
  await uploadBytes(storageRef, file);
  
  // Get the download URL
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
}

/**
 * Delete a photo from Firebase Storage
 * @param photoUrl - The Firebase Storage URL of the photo to delete
 */
export async function deletePrescriptionPhoto(photoUrl: string): Promise<void> {
  const storage = getFirebaseStorage();
  
  // Extract the path from the URL
  // Firebase Storage URLs are in the format:
  // https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
  try {
    const url = new URL(photoUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
    if (!pathMatch) {
      throw new Error('Invalid photo URL');
    }
    
    // Decode the path (URL encoded)
    const encodedPath = pathMatch[1];
    const decodedPath = decodeURIComponent(encodedPath);
    
    const storageRef = ref(storage, decodedPath);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw new Error('Failed to delete photo');
  }
}

/**
 * Delete all photos for a prescription
 * @param userId - The user's ID
 * @param prescriptionId - The prescription's ID
 * @param photoUrls - Array of photo URLs to delete
 */
export async function deleteAllPrescriptionPhotos(
  userId: string,
  prescriptionId: string,
  photoUrls: string[]
): Promise<void> {
  const deletePromises = photoUrls.map((url) => deletePrescriptionPhoto(url));
  await Promise.all(deletePromises);
}

