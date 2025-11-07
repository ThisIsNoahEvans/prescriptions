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
import { Category } from '../types';

const COLLECTION_NAME = 'categories';

/**
 * Get the Firestore collection reference for categories
 */
function getCategoryCollection(userId: string) {
  const db = getFirebaseDb();
  return collection(db, 'users', userId, COLLECTION_NAME);
}

/**
 * Add a new category
 */
export async function addCategory(
  userId: string,
  category: Omit<Category, 'id' | 'createdAt'>
): Promise<string> {
  const collectionRef = getCategoryCollection(userId);
  const docRef = await addDoc(collectionRef, {
    ...category,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

/**
 * Update a category
 */
export async function updateCategory(
  userId: string,
  categoryId: string,
  updates: Partial<Omit<Category, 'id' | 'createdAt'>>
): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, 'users', userId, COLLECTION_NAME, categoryId);
  await updateDoc(docRef, updates);
}

/**
 * Delete a category
 */
export async function deleteCategory(userId: string, categoryId: string): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, 'users', userId, COLLECTION_NAME, categoryId);
  await deleteDoc(docRef);
}

/**
 * Subscribe to category changes
 */
export function subscribeToCategories(
  userId: string,
  callback: (categories: Category[]) => void
): () => void {
  const collectionRef = getCategoryCollection(userId);
  const q = query(collectionRef);

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const categories: Category[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Category, 'id'>),
      }));
      callback(categories);
    },
    (error) => {
      console.error('Error listening to categories:', error);
      callback([]);
    }
  );
}

