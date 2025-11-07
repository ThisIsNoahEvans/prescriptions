import { useState, useEffect } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

interface UnlinkProviderModalProps {
  providerName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onError: (message: string) => void;
}

export function UnlinkProviderModal({
  providerName,
  isOpen,
  onClose,
  onConfirm,
  onError,
}: UnlinkProviderModalProps) {
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setIsVisible(false);
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
    if (isUnlinking) return;
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
    setIsUnlinking(true);
    try {
      await onConfirm();
      handleClose();
    } catch (error) {
      console.error('Error unlinking provider:', error);
      onError('Error unlinking sign-in method. Please try again.');
      setIsUnlinking(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isUnlinking) {
      handleClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-60 transition-opacity duration-300 ${
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
        <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">Unlink Sign-In Method</h2>
        <p className="text-lg mb-6 text-gray-700 dark:text-gray-300">
          Are you sure you want to unlink <strong>{providerName}</strong>?
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          You will no longer be able to sign in using this method. Make sure you have another sign-in method available.
        </p>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isUnlinking}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isUnlinking}
            className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUnlinking ? 'Unlinking...' : 'Unlink'}
          </button>
        </div>
      </div>
    </div>
  );
}

