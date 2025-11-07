import { useState } from 'react';

interface PhotoGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrls: string[];
  prescriptionName: string;
}

export function PhotoGalleryModal({
  isOpen,
  onClose,
  photoUrls,
  prescriptionName,
}: PhotoGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen || photoUrls.length === 0) return null;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? photoUrls.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === photoUrls.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-lg"
          aria-label="Close gallery"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Navigation buttons */}
        {photoUrls.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-lg"
              aria-label="Previous photo"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-lg"
              aria-label="Next photo"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}

        {/* Image */}
        <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-2xl">
          <img
            src={photoUrls[currentIndex]}
            alt={`${prescriptionName} - Photo ${currentIndex + 1}`}
            className="w-full h-auto max-h-[80vh] object-contain"
          />
        </div>

        {/* Photo counter */}
        {photoUrls.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm">
            {currentIndex + 1} / {photoUrls.length}
          </div>
        )}

        {/* Thumbnail strip */}
        {photoUrls.length > 1 && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4">
            {photoUrls.map((url, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? 'border-blue-500 ring-2 ring-blue-300'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

