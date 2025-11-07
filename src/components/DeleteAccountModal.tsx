import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { User } from 'firebase/auth';
import { deleteAccount } from '../services/authService';
import { deleteAllUserData } from '../services/userDataService';
import { ReauthenticateModal } from './ReauthenticateModal';

interface DeleteAccountModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onError: (message: string) => void;
}

export function DeleteAccountModal({
  user,
  isOpen,
  onClose,
  onConfirm,
  onError,
}: DeleteAccountModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showReauthModal, setShowReauthModal] = useState(false);
  const requiredText = 'DELETE';

  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  const performDelete = async () => {
    try {
      // Delete all user data first
      await deleteAllUserData(user.uid);
      
      // Then delete the auth account
      await deleteAccount(user);
      
      // Call the parent's onConfirm to handle sign out
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error deleting account:', error);
      onError('Error deleting account. Please try again.');
    }
  };

  const handleConfirm = async () => {
    if (confirmText !== requiredText) {
      onError(`Please type "${requiredText}" to confirm.`);
      return;
    }

    setIsDeleting(true);
    try {
      await performDelete();
    } catch (error) {
      console.error('Error deleting account:', error);
      const errorCode = (error as { code?: string }).code;
      if (errorCode === 'auth/requires-recent-login' || errorCode === 'auth/user-token-expired') {
        // Need to re-authenticate before deleting
        setShowReauthModal(true);
        setIsDeleting(false);
      } else {
        onError('Error deleting account. Please try again.');
        setIsDeleting(false);
      }
    }
  };

  const handleReauthSuccess = async () => {
    setShowReauthModal(false);
    setIsDeleting(true);
    try {
      await performDelete();
    } catch (error) {
      console.error('Error deleting account after re-auth:', error);
      const errorCode = (error as { code?: string }).code;
      if (errorCode === 'auth/requires-recent-login' || errorCode === 'auth/user-token-expired') {
        onError('Re-authentication failed. Please try again.');
      } else {
        onError('Error deleting account. Please try again.');
      }
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg" contentClassName="p-8">
        <h2 className="text-2xl font-semibold mb-2 text-red-600 dark:text-red-400">Delete Account</h2>
        <p className="text-lg mb-4 text-gray-700 dark:text-gray-300">
          Are you sure you want to delete your account?
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          This action cannot be undone. All your prescriptions, categories, photos, and account data will be permanently deleted.
        </p>

        <div className="mb-6">
          <label
            htmlFor="confirm-delete"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Type <strong>{requiredText}</strong> to confirm:
          </label>
          <input
            type="text"
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
            placeholder={requiredText}
            disabled={isDeleting}
          />
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting || confirmText !== requiredText}
            className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>

      <ReauthenticateModal
        user={user}
        isOpen={showReauthModal}
        onClose={() => {
          setShowReauthModal(false);
          setIsDeleting(false);
        }}
        onSuccess={handleReauthSuccess}
        onError={(message) => {
          onError(message);
          setShowReauthModal(false);
          setIsDeleting(false);
        }}
      />
    </Modal>
  );
}

