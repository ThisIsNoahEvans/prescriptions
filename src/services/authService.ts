import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCustomToken,
  onAuthStateChanged,
  User,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  multiFactor,
  TotpMultiFactorGenerator,
  TotpSecret,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  getMultiFactorResolver,
  MultiFactorResolver,
  MultiFactorError,
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
 * Sign in with email and password
 * Returns the user if successful, or throws an error with code 'auth/multi-factor-auth-required'
 * In that case, use resolveMfaSignIn to complete the sign-in
 */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/multi-factor-auth-required') {
      // Re-throw with the resolver attached
      throw { ...error, resolver: getMultiFactorResolver(auth, error as MultiFactorError) };
    }
    throw error;
  }
}

/**
 * Resolve MFA sign-in with TOTP code
 */
export async function resolveMfaSignIn(
  resolver: MultiFactorResolver,
  verificationCode: string
): Promise<User> {
  const totpAssertion = TotpMultiFactorGenerator.assertionForSignIn(
    resolver.hints[0].uid,
    verificationCode
  );
  const userCredential = await resolver.resolveSignIn(totpAssertion);
  return userCredential.user;
}

/**
 * Create account with email and password
 */
export async function createAccountWithEmail(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Send verification email
  await sendEmailVerification(user);
  
  return user;
}

/**
 * Send email verification to the current user
 */
export async function sendVerificationEmail(user: User): Promise<void> {
  await sendEmailVerification(user);
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email);
}

/**
 * Check if user has MFA enabled
 */
export function hasMFA(user: User): boolean {
  return multiFactor(user).enrolledFactors.length > 0;
}

/**
 * Get enrolled MFA factors
 */
export function getMFAFactors(user: User) {
  return multiFactor(user).enrolledFactors;
}

/**
 * Start TOTP MFA enrollment
 */
export async function startTotpMFAEnrollment(user: User): Promise<{ secret: TotpSecret; qrCodeUrl: string }> {
  const session = await multiFactor(user).getSession();
  const totpSecret = await TotpMultiFactorGenerator.generateSecret(session);
  // Generate QR code URL with account name and issuer
  const accountName = user.email || 'user';
  const issuer = 'Prescription Tracker';
  // generateQrCodeUrl takes accountName and issuer as separate string parameters
  const qrCodeUrl = totpSecret.generateQrCodeUrl(accountName, issuer);
  return { secret: totpSecret, qrCodeUrl };
}

/**
 * Complete TOTP MFA enrollment
 */
export async function completeTotpMFAEnrollment(
  user: User,
  secret: TotpSecret,
  verificationCode: string
): Promise<void> {
  const multiFactorAssertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, verificationCode);
  await multiFactor(user).enroll(multiFactorAssertion, 'TOTP Authenticator');
}

/**
 * Re-authenticate user with password (for email/password users)
 */
export async function reauthenticateWithPassword(user: User, password: string): Promise<void> {
  if (!user.email) {
    throw new Error('User email is required for re-authentication');
  }
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
}

/**
 * Re-authenticate user with Google (for Google sign-in users)
 */
export async function reauthenticateWithGoogle(user: User): Promise<void> {
  const provider = new GoogleAuthProvider();
  await reauthenticateWithPopup(user, provider);
}

/**
 * Unenroll MFA factor
 */
export async function unenrollMFA(user: User, factorUid: string): Promise<void> {
  await multiFactor(user).unenroll(
    multiFactor(user).enrolledFactors.find((f) => f.uid === factorUid)!
  );
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

