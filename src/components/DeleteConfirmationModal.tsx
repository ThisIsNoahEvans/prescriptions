import { useState, useEffect } from 'react';
import { Prescription } from '../types';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

interface DeleteConfirmationModalProps {
  prescription: Prescription | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (prescription: Prescription) => Promise<void>;
  onError: (message: string) => void;
}

export function DeleteConfirmationModal({
  prescription,
  isOpen,
  onClose,
  onConfirm,
  onError,
}: DeleteConfirmationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [prescriptionName, setPrescriptionName] = useState<string>('');

  useEffect(() => {
    if (isOpen && prescription) {
      setIsClosing(false);
      setIsVisible(false);
      setPrescriptionName(prescription.name); // Store the name so it persists during closing animation
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
  }, [isOpen, prescription]);

  const handleClose = () => {
    if (isDeleting) return;
    setIsClosing(true);
    setIsVisible(false);
    // Restore body scroll immediately when closing starts
    unlockBodyScroll();
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // Don't render if not open and not closing (allows closing animation to complete)
  if ((!isOpen || !prescription) && !isClosing) {
    return null;
  }

  // Don't render content if prescription is null during closing animation
  if (!prescription && !prescriptionName) {
    return null;
  }

  const handleConfirm = async () => {
    if (!prescription) return;
    setIsDeleting(true);
    try {
      await onConfirm(prescription);
      handleClose();
    } catch (error) {
      console.error('Error deleting prescription:', error);
      onError('Error deleting prescription. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isDeleting) {
      handleClose();
    }
  };

  // Use stored name if prescription is null (during closing animation)
  const displayName = prescription?.name || prescriptionName;

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
        <h2 className="text-2xl font-semibold mb-2 text-red-600 dark:text-red-400">Delete Prescription</h2>
        <p className="text-lg mb-6 text-gray-700 dark:text-gray-300">
          Are you sure you want to delete <strong>{displayName}</strong>?
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          This action cannot be undone. All prescription data will be permanently deleted.
        </p>

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
            disabled={isDeleting}
            className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

