import { useState, FormEvent, useEffect } from 'react';
import { Modal } from './Modal';
import { User } from 'firebase/auth';
import { linkEmailPasswordProvider } from '../services/authService';

interface LinkProviderModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function LinkProviderModal({
  user,
  isOpen,
  onClose,
  onSuccess,
  onError,
}: LinkProviderModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword) {
      onError('Please fill out all fields.');
      return;
    }

    if (password !== confirmPassword) {
      onError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      onError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedUser = await linkEmailPasswordProvider(user, email, password);
      // Reload the user object to get updated provider data
      await updatedUser.reload();
      onSuccess('Email/password account linked successfully!');
      onClose();
    } catch (error: any) {
      console.error('Error linking email/password:', error);
      if (error.code === 'auth/email-already-in-use') {
        onError('This email is already associated with another account.');
      } else if (error.code === 'auth/invalid-email') {
        onError('Invalid email address.');
      } else if (error.code === 'auth/weak-password') {
        onError('Password is too weak. Please choose a stronger password.');
      } else {
        onError('Error linking email/password. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg" contentClassName="p-8">
        <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">Link Email/Password</h2>
        <p className="text-lg mb-6 text-gray-700 dark:text-gray-300">
          Add an email and password to your account so you can sign in with either method.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label
              htmlFor="link-email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email
            </label>
            <input
              type="email"
              id="link-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="your@email.com"
            />
          </div>

          <div className="mb-5">
            <label
              htmlFor="link-password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Password
            </label>
            <input
              type="password"
              id="link-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="At least 6 characters"
            />
          </div>

          <div className="mb-8">
            <label
              htmlFor="link-confirm-password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Confirm Password
            </label>
            <input
              type="password"
              id="link-confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Confirm your password"
            />
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Linking...' : 'Link Account'}
            </button>
          </div>
        </form>
    </Modal>
  );
}

