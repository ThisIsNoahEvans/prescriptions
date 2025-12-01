import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  Timestamp,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/config';
import { Prescription, SupplyLogEntry } from '../types';

const COLLECTION_NAME = 'prescriptions';

/**
 * Get the Firestore collection reference for prescriptions
 */
function getPrescriptionCollection(userId: string) {
  const db = getFirebaseDb();
  return collection(db, 'users', userId, COLLECTION_NAME);
}

/**
 * Add a new prescription
 */
export async function addPrescription(
  userId: string,
  prescription: Omit<Prescription, 'id' | 'createdAt' | 'supplyLog'>
): Promise<string> {
  const collectionRef = getPrescriptionCollection(userId);
  const docRef = await addDoc(collectionRef, {
    ...prescription,
    supplyLog: [],
    photoUrls: prescription.photoUrls || [], // Ensure photoUrls is always present
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

/**
 * Log a delivery for a prescription
 */
export async function logDelivery(
  userId: string,
  prescriptionId: string,
  deliveryDate: Date,
  quantity: number
): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, 'users', userId, COLLECTION_NAME, prescriptionId);

  // Get current prescription to update supply log
  const { getDoc } = await import('firebase/firestore');
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('Prescription not found');
  }

  const currentData = docSnap.data() as Prescription;
  const newLogEntry: SupplyLogEntry = {
    date: Timestamp.fromDate(deliveryDate),
    quantity,
  };

  const updatedLog = [...currentData.supplyLog, newLogEntry];

  await updateDoc(docRef, {
    supplyLog: updatedLog,
  });
}

/**
 * Update prescription photos
 */
export async function updatePrescriptionPhotos(
  userId: string,
  prescriptionId: string,
  photoUrls: string[]
): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, 'users', userId, COLLECTION_NAME, prescriptionId);
  await updateDoc(docRef, { photoUrls });
}

/**
 * Delete a prescription
 */
export async function deletePrescription(userId: string, prescriptionId: string): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, 'users', userId, COLLECTION_NAME, prescriptionId);
  await deleteDoc(docRef);
}

/**
 * Subscribe to prescription changes
 */
export function subscribeToPrescriptions(
  userId: string,
  callback: (prescriptions: Prescription[]) => void
): () => void {
  const collectionRef = getPrescriptionCollection(userId);
  const q = query(collectionRef);

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const prescriptions: Prescription[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Prescription, 'id'>),
      }));
      callback(prescriptions);
    },
    (error) => {
      console.error('Error listening to prescriptions:', error);
      callback([]);
    }
  );
}

