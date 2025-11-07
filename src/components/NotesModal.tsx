import { Modal } from './Modal';

interface NotesModalProps {
  prescriptionName: string;
  notes: string;
  isOpen: boolean;
  onClose: () => void;
}

export function NotesModal({ prescriptionName, notes, isOpen, onClose }: NotesModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl" contentClassName="p-6 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Notes: {prescriptionName}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="prose dark:prose-invert max-w-none flex-1 overflow-y-auto min-h-0">
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
          {notes}
        </p>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

