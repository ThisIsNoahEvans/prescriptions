import { useState } from 'react';
import { Modal } from './Modal';

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

  const handleConfirm = async () => {
    setIsUnlinking(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error unlinking provider:', error);
      onError('Error unlinking sign-in method. Please try again.');
      setIsUnlinking(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg" contentClassName="p-8" className="z-[60]">
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
            onClick={onClose}
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
    </Modal>
  );
}

