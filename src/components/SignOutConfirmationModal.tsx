import { useState } from 'react';
import { Modal } from './Modal';

interface SignOutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onError: (message: string) => void;
}

export function SignOutConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  onError,
}: SignOutConfirmationModalProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleConfirm = async () => {
    setIsSigningOut(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error signing out:', error);
      onError('Error signing out. Please try again.');
      setIsSigningOut(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg" contentClassName="p-8">
        <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">Sign Out</h2>
        <p className="text-lg mb-6 text-gray-700 dark:text-gray-300">
          Are you sure you want to sign out?
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          You will need to sign in again to access your prescriptions.
        </p>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSigningOut}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSigningOut}
            className="bg-blue-600 dark:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSigningOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
    </Modal>
  );
}

