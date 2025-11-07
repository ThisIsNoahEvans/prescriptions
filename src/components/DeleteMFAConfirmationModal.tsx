import { Modal } from './Modal';

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
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg" contentClassName="p-8" className="z-[60]">
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
            onClick={onClose}
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
    </Modal>
  );
}

