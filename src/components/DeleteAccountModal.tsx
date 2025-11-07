import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { deleteAccount } from '../services/authService';
import { deleteAllUserData } from '../services/userDataService';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

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
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const requiredText = 'DELETE';

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setIsVisible(false);
      setConfirmText('');
      lockBodyScroll();
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
      unlockBodyScroll();
    }

    return () => {
      unlockBodyScroll();
    };
  }, [isOpen]);

  const handleClose = () => {
    if (isDeleting) return;
    setIsClosing(true);
    setIsVisible(false);
    unlockBodyScroll();
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!isOpen && !isClosing) {
    return null;
  }

  const handleConfirm = async () => {
    if (confirmText !== requiredText) {
      onError(`Please type "${requiredText}" to confirm.`);
      return;
    }

    setIsDeleting(true);
    try {
      // Delete all user data first
      await deleteAllUserData(user.uid);
      
      // Then delete the auth account
      await deleteAccount(user);
      
      // Call the parent's onConfirm to handle sign out
      await onConfirm();
      handleClose();
    } catch (error) {
      console.error('Error deleting account:', error);
      onError('Error deleting account. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isDeleting) {
      handleClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white dark:bg-gray-800 w-full max-w-lg p-8 rounded-2xl shadow-2xl transition-transform duration-300 ease-out ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
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
            onClick={handleClose}
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
      </div>
    </div>
  );
}

