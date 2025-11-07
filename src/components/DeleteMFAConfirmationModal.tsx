import { useState, useEffect } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

interface DeleteMFAConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onError: (message: string) => void;
}

export function DeleteMFAConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  onError,
}: DeleteMFAConfirmationModalProps) {
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

  const handleConfirm = () => {
    onConfirm();
    handleClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
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
        <h2 className="text-2xl font-semibold mb-2 text-red-600 dark:text-red-400">Disable MFA</h2>
        <p className="text-lg mb-6 text-gray-700 dark:text-gray-300">
          Are you sure you want to disable two-factor authentication?
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          This will make your account less secure. You can re-enable it at any time.
        </p>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={handleClose}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200"
          >
            Disable MFA
          </button>
        </div>
      </div>
    </div>
  );
}

