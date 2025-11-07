import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Category } from '../types';
import { subscribeToCategories, addCategory, updateCategory, deleteCategory } from '../services/categoryService';
import { DeleteCategoryModal } from './DeleteCategoryModal';

interface CategoryManagerProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

const DEFAULT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#6366F1', // indigo
];

export function CategoryManager({ userId, isOpen, onClose, onError, onSuccess }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(DEFAULT_COLORS[0]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCategoryForDelete, setSelectedCategoryForDelete] = useState<Category | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeToCategories(userId, (categoriesList) => {
      setCategories(categoriesList);
    });

    return () => {
      unsubscribe();
    };
  }, [userId, isOpen]);

  const handleClose = () => {
    setEditingId(null);
    setEditingName('');
    setNewCategoryName('');
    setNewCategoryColor(DEFAULT_COLORS[0]);
    onClose();
  };

  const handleStartEdit = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const handleSaveEdit = async (categoryId: string) => {
    if (!editingName.trim()) {
      onError('Category name cannot be empty.');
      return;
    }

    try {
      await updateCategory(userId, categoryId, { name: editingName.trim() });
      setEditingId(null);
      setEditingName('');
      onSuccess('Category updated successfully.');
    } catch (error) {
      console.error('Error updating category:', error);
      onError('Error updating category. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = (category: Category) => {
    setSelectedCategoryForDelete(category);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (category: Category) => {
    try {
      await deleteCategory(userId, category.id);
      onSuccess('Category deleted successfully.');
      setIsDeleteModalOpen(false);
      setSelectedCategoryForDelete(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      onError('Error deleting category. Please try again.');
      throw error;
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      onError('Please enter a category name.');
      return;
    }

    setIsAdding(true);
    try {
      await addCategory(userId, {
        name: newCategoryName.trim(),
        color: newCategoryColor,
      });
      setNewCategoryName('');
      setNewCategoryColor(DEFAULT_COLORS[0]);
      onSuccess('Category added successfully.');
    } catch (error) {
      console.error('Error adding category:', error);
      onError('Error adding category. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="2xl" contentClassName="p-6">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Manage Categories</h2>
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

        {/* Add New Category */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add New Category</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddCategory();
                }
              }}
            />
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCategoryColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      newCategoryColor === color
                        ? 'border-gray-900 dark:border-white scale-110'
                        : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddCategory}
                disabled={isAdding || !newCategoryName.trim()}
                className="flex-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdding ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>

        {/* Categories List */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Categories ({categories.length})
          </h3>
          {categories.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No categories yet. Create your first category above.
            </p>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div
                    className="w-6 h-6 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  {editingId === category.id ? (
                    <>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit(category.id);
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(category.id)}
                        className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                        aria-label="Save"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        aria-label="Cancel"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-gray-900 dark:text-white font-medium">{category.name}</span>
                      <button
                        onClick={() => handleStartEdit(category)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                        aria-label="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(category)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                        aria-label="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
          >
            Close
          </button>
        </div>

      <DeleteCategoryModal
        category={selectedCategoryForDelete}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedCategoryForDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        onError={onError}
      />
    </Modal>
  );
}

