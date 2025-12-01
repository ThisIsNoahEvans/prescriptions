import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Prescription } from '../types';

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
  const [prescriptionName, setPrescriptionName] = useState<string>('');

  useEffect(() => {
    if (isOpen && prescription) {
      setPrescriptionName(prescription.name);
    }
  }, [isOpen, prescription]);

  if (!prescription) {
    return null;
  }

  const handleConfirm = async () => {
    if (!prescription) return;
    setIsDeleting(true);
    try {
      await onConfirm(prescription);
      onClose();
    } catch (error) {
      console.error('Error deleting prescription:', error);
      onError('Error deleting prescription. Please try again.');
      setIsDeleting(false);
    }
  };

  const displayName = prescription?.name || prescriptionName;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg" contentClassName="p-8">
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
            onClick={onClose}
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
    </Modal>
  );
}

