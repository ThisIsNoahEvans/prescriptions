import { useState, useEffect } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

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
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setIsVisible(false);
      // Lock body scroll with scrollbar compensation
      lockBodyScroll();
      // Trigger animation after mount
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
    if (isSigningOut) return;
    setIsClosing(true);
    setIsVisible(false);
    // Restore body scroll immediately when closing starts
    unlockBodyScroll();
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // Don't render if not open and not closing (allows closing animation to complete)
  if (!isOpen && !isClosing) {
    return null;
  }

  const handleConfirm = async () => {
    setIsSigningOut(true);
    try {
      await onConfirm();
      handleClose();
    } catch (error) {
      console.error('Error signing out:', error);
      onError('Error signing out. Please try again.');
      setIsSigningOut(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSigningOut) {
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
            onClick={handleClose}
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
      </div>
    </div>
  );
}

