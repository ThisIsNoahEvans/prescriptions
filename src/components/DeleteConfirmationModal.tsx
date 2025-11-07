import { useState } from 'react';
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

  if (!isOpen || !prescription) {
    return null;
  }

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(prescription);
      onClose();
    } catch (error) {
      console.error('Error deleting prescription:', error);
      onError('Error deleting prescription. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onClose();
    }
  };

  return (
    <div
      className={`modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 transition-opacity duration-250 ${
        isOpen ? 'visible opacity-100' : 'invisible opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`modal-content bg-white w-full max-w-lg p-8 rounded-2xl shadow-2xl transition-transform duration-250 ${
          isOpen ? 'scale-100' : 'scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-semibold mb-2 text-red-600">Delete Prescription</h2>
        <p className="text-lg mb-6 text-gray-700">
          Are you sure you want to delete <strong>{prescription.name}</strong>?
        </p>
        <p className="text-sm text-gray-500 mb-8">
          This action cannot be undone. All prescription data will be permanently deleted.
        </p>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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

