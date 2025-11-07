import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Category } from '../types';

interface DeleteCategoryModalProps {
  category: Category | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (category: Category) => Promise<void>;
  onError: (message: string) => void;
}

export function DeleteCategoryModal({
  category,
  isOpen,
  onClose,
  onConfirm,
  onError,
}: DeleteCategoryModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [categoryName, setCategoryName] = useState<string>('');

  useEffect(() => {
    if (isOpen && category) {
      setCategoryName(category.name);
    }
  }, [isOpen, category]);

  if (!category) {
    return null;
  }

  const handleConfirm = async () => {
    if (!category) return;
    setIsDeleting(true);
    try {
      await onConfirm(category);
      onClose();
    } catch (error) {
      console.error('Error deleting category:', error);
      onError('Error deleting category. Please try again.');
      setIsDeleting(false);
    }
  };

  const displayName = category?.name || categoryName;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg" contentClassName="p-8">
        <h2 className="text-2xl font-semibold mb-2 text-red-600 dark:text-red-400">Delete Category</h2>
        <p className="text-lg mb-6 text-gray-700 dark:text-gray-300">
          Are you sure you want to delete <strong>{displayName}</strong>?
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          This action cannot be undone. The category will be removed from all prescriptions using it.
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

