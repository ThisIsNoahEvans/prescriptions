import { useState, FormEvent } from 'react';
import { Modal } from './Modal';
import { User } from 'firebase/auth';
import {
  reauthenticateWithPassword,
  reauthenticateWithGoogle,
} from '../services/authService';

interface ReauthenticateModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function ReauthenticateModal({
  user,
  isOpen,
  onClose,
  onSuccess,
  onError,
}: ReauthenticateModalProps) {
  const [password, setPassword] = useState('');
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  const [isReauthenticatingGoogle, setIsReauthenticatingGoogle] = useState(false);

  // Check if user signed in with Google
  const isGoogleUser = user.providerData.some(
    (provider) => provider.providerId === 'google.com'
  );
  const isEmailUser = user.providerData.some(
    (provider) => provider.providerId === 'password'
  );

  if (!isOpen) {
    return null;
  }

  const handlePasswordReauth = async (e: FormEvent) => {
    e.preventDefault();

    if (!password) {
      onError('Please enter your password.');
      return;
    }

    setIsReauthenticating(true);
    try {
      await reauthenticateWithPassword(user, password);
      onSuccess();
      setPassword('');
      onClose();
    } catch (error) {
      console.error('Error re-authenticating:', error);
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'auth/wrong-password') {
        onError('Incorrect password. Please try again.');
      } else if (firebaseError.code === 'auth/invalid-credential') {
        onError('Invalid password. Please try again.');
      } else {
        onError('Error re-authenticating. Please try again.');
      }
    } finally {
      setIsReauthenticating(false);
    }
  };

  const handleGoogleReauth = async () => {
    setIsReauthenticatingGoogle(true);
    try {
      await reauthenticateWithGoogle(user);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error re-authenticating with Google:', error);
      onError('Error re-authenticating with Google. Please try again.');
    } finally {
      setIsReauthenticatingGoogle(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md" contentClassName="p-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Re-authentication Required
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          For security reasons, please re-authenticate to continue with this action.
        </p>

        {isEmailUser && (
          <form onSubmit={handlePasswordReauth} className="mb-4">
            <div className="mb-4">
              <label
                htmlFor="reauth-password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Enter your password
              </label>
              <input
                type="password"
                id="reauth-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="••••••"
                disabled={isReauthenticating}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isReauthenticating}
                className="flex-1 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReauthenticating ? 'Verifying...' : 'Continue'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isReauthenticating}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 px-6 rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {isGoogleUser && (
          <div className="space-y-3">
            <button
              onClick={handleGoogleReauth}
              disabled={isReauthenticatingGoogle}
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
              {isReauthenticatingGoogle ? 'Re-authenticating...' : 'Re-authenticate with Google'}
            </button>
            <button
              onClick={onClose}
              disabled={isReauthenticatingGoogle}
              className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 px-6 rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        )}

        {!isEmailUser && !isGoogleUser && (
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please sign out and sign back in to continue.
            </p>
            <button
              onClick={onClose}
              className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 px-6 rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
            >
              Close
            </button>
          </div>
        )}
    </Modal>
  );
}

