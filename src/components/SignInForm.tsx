import { useState, FormEvent } from 'react';
import {
  signInWithGoogle,
  signInWithEmail,
  createAccountWithEmail,
  sendVerificationEmail,
  sendPasswordReset,
  resolveMfaSignIn,
} from '../services/authService';
import { User, MultiFactorResolver } from 'firebase/auth';

interface SignInFormProps {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export function SignInForm({ onError, onSuccess }: SignInFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      onError('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      onError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const user = await createAccountWithEmail(email, password);
        setNeedsVerification(true);
        setVerificationEmail(email);
        onSuccess('Account created! Please check your email to verify your account.');
      } else {
        try {
          const user = await signInWithEmail(email, password);
          
          // Check if email is verified
          if (!user.emailVerified) {
            setNeedsVerification(true);
            setVerificationEmail(email);
            onError('Please verify your email address before signing in. Check your inbox for the verification email.');
            // Sign out the user since email is not verified
            const { signOut } = await import('firebase/auth');
            const { getFirebaseAuth } = await import('../firebase/config');
            await signOut(getFirebaseAuth());
            return;
          }
          
          onSuccess('Signed in successfully!');
        } catch (mfaError: any) {
          // Handle MFA required error
          if (mfaError.code === 'auth/multi-factor-auth-required' && mfaError.resolver) {
            setMfaResolver(mfaError.resolver);
            setNeedsMfa(true);
            setIsLoading(false);
            return;
          }
          throw mfaError;
        }
      }
    } catch (error: any) {
      console.error('Error with email/password:', error);
      let errorMessage = 'An error occurred. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please sign up instead.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.code === 'auth/email-not-verified') {
        errorMessage = 'Please verify your email address before signing in.';
        setNeedsVerification(true);
        setVerificationEmail(email);
      }
      
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!mfaCode || mfaCode.length !== 6) {
      onError('Please enter a valid 6-digit verification code.');
      return;
    }

    if (!mfaResolver) {
      onError('MFA resolver not available. Please try signing in again.');
      return;
    }

    setIsVerifyingMfa(true);
    try {
      await resolveMfaSignIn(mfaResolver, mfaCode);
      onSuccess('Signed in successfully!');
      setNeedsMfa(false);
      setMfaResolver(null);
      setMfaCode('');
    } catch (error: any) {
      console.error('Error verifying MFA code:', error);
      if (error.code === 'auth/invalid-verification-code') {
        onError('Invalid verification code. Please try again.');
      } else {
        onError('Error verifying code. Please try again.');
      }
    } finally {
      setIsVerifyingMfa(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      onSuccess('Signed in with Google successfully!');
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      if (error.code === 'auth/multi-factor-auth-required') {
        onError('MFA is required for this account. Please use email/password sign-in.');
      } else {
        onError('Error signing in with Google. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      onError('Please enter your email address.');
      return;
    }

    setIsSendingReset(true);
    try {
      await sendPasswordReset(resetEmail);
      onSuccess('Password reset email sent! Please check your inbox.');
      setShowPasswordReset(false);
      setResetEmail('');
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      if (error.code === 'auth/user-not-found') {
        onError('No account found with this email address.');
      } else if (error.code === 'auth/invalid-email') {
        onError('Please enter a valid email address.');
      } else {
        onError('Error sending password reset email. Please try again.');
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResendingVerification(true);
    try {
      // Get the current user (they should be signed in but not verified)
      const { getFirebaseAuth } = await import('../firebase/config');
      const { getAuth, sendEmailVerification } = await import('firebase/auth');
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser && currentUser.email === verificationEmail) {
        await sendEmailVerification(currentUser);
        onSuccess('Verification email sent! Please check your inbox.');
      } else {
        // If user is not signed in, try to sign them in first
        const user = await signInWithEmail(verificationEmail, password);
        await sendVerificationEmail(user);
        // Sign them out again
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
        onSuccess('Verification email sent! Please check your inbox.');
      }
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      if (error.code === 'auth/too-many-requests') {
        onError('Too many requests. Please wait a few minutes before requesting another verification email.');
      } else {
        onError('Error sending verification email. Please try again.');
      }
    } finally {
      setIsResendingVerification(false);
    }
  };

  // Show MFA verification form
  if (needsMfa) {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
          Two-Factor Authentication
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
          Enter the 6-digit code from your authenticator app to complete sign-in.
        </p>

        <form onSubmit={handleMfaSubmit} className="mb-6">
          <div className="mb-4">
            <label
              htmlFor="mfa-code"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Verification Code
            </label>
            <input
              type="text"
              id="mfa-code"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-center text-2xl tracking-widest"
              placeholder="000000"
              disabled={isVerifyingMfa}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isVerifyingMfa || mfaCode.length !== 6}
            className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifyingMfa ? 'Verifying...' : 'Verify & Sign In'}
          </button>
        </form>

        <button
          onClick={() => {
            setNeedsMfa(false);
            setMfaResolver(null);
            setMfaCode('');
            setEmail('');
            setPassword('');
          }}
          className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 px-6 rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  // Show password reset form
  if (showPasswordReset) {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
          Reset Password
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handlePasswordReset} className="mb-6">
          <div className="mb-4">
            <label
              htmlFor="reset-email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email
            </label>
            <input
              type="email"
              id="reset-email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="your@email.com"
              disabled={isSendingReset}
            />
          </div>

          <button
            type="submit"
            disabled={isSendingReset}
            className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSendingReset ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <button
          onClick={() => {
            setShowPasswordReset(false);
            setResetEmail('');
          }}
          className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 px-6 rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  // Show verification message if needed
  if (needsVerification) {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
          Verify Your Email
        </h2>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-blue-800 dark:text-blue-200 text-sm mb-2">
            <strong>Verification email sent!</strong>
          </p>
          <p className="text-blue-700 dark:text-blue-300 text-sm mb-4">
            We've sent a verification email to <strong>{verificationEmail}</strong>. Please check your inbox and click the verification link to activate your account.
          </p>
          <p className="text-blue-600 dark:text-blue-400 text-xs">
            Didn't receive the email? Check your spam folder or click the button below to resend.
          </p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={handleResendVerification}
            disabled={isResendingVerification}
            className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResendingVerification ? 'Sending...' : 'Resend Verification Email'}
          </button>
          <button
            onClick={() => {
              setNeedsVerification(false);
              setVerificationEmail('');
              setEmail('');
              setPassword('');
            }}
            className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 px-6 rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
        {isSignUp ? 'Create Account' : 'Sign In'}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
        {isSignUp
          ? 'Create an account to access your prescription tracker.'
          : 'Sign in to access your prescription tracker.'}
      </p>

      {/* Email/Password Form */}
      <form onSubmit={handleEmailSubmit} className="mb-6">
        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="your@email.com"
            disabled={isLoading}
          />
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            {!isSignUp && (
              <button
                type="button"
                onClick={() => setShowPasswordReset(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                disabled={isLoading}
              >
                Forgot password?
              </button>
            )}
          </div>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="••••••"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading
            ? 'Loading...'
            : isSignUp
            ? 'Create Account'
            : 'Sign In'}
        </button>
      </form>

      {/* Toggle between sign in and sign up */}
      <div className="text-center mb-6">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setEmail('');
            setPassword('');
          }}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          disabled={isLoading}
        >
          {isSignUp
            ? 'Already have an account? Sign in'
            : "Don't have an account? Sign up"}
        </button>
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            Or continue with
          </span>
        </div>
      </div>

      {/* Social Sign In Button */}
      <div>
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-3 px-6 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

