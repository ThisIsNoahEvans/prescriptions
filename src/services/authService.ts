import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithCustomToken,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import { getFirebaseAuth } from '../firebase/config';

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  return userCredential.user;
}

/**
 * Sign in with a custom token
 */
export async function signInWithCustomTokenAuth(token: string): Promise<User> {
  const auth = getFirebaseAuth();
  const userCredential = await signInWithCustomToken(auth, token);
  return userCredential.user;
}

/**
 * Sign out
 */
export async function signOutAuth(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

