import { useState } from 'react';
import { Prescription, SupplyInfo, Category } from '../types';
import { formatDisplayDate, dateDiffInDays, normalizeDate } from '../utils/dateUtils';
import { PhotoGalleryModal } from './PhotoGalleryModal';

interface PrescriptionCardProps {
  prescription: Prescription;
  supplyInfo: SupplyInfo;
  categories: Category[];
  onLogDelivery: (prescription: Prescription) => void;
  onViewLogs: (prescription: Prescription) => void;
  onDelete: (prescription: Prescription) => void;
}

export function PrescriptionCard({
  prescription,
  supplyInfo,
  categories,
  onLogDelivery,
  onViewLogs,
  onDelete,
}: PrescriptionCardProps) {
  const [isPhotoGalleryOpen, setIsPhotoGalleryOpen] = useState(false);
  const today = normalizeDate(new Date());
  const reorderDiff = dateDiffInDays(supplyInfo.reorderDate, today);
  const hasPhotos = prescription.photoUrls && prescription.photoUrls.length > 0;
  const category = prescription.categoryId
    ? categories.find((cat) => cat.id === prescription.categoryId)
    : null;

  // Determine re-order date color and label
  let reorderColor = 'text-gray-700';
  let reorderLabel = '';

  if (reorderDiff < 0) {
    // Overdue
    reorderColor = 'text-red-600 font-bold';
    reorderLabel = `(Overdue by ${Math.abs(reorderDiff)} days)`;
  } else if (reorderDiff === 0) {
    // Today
    reorderColor = 'text-red-600 font-bold text-lg';
    reorderLabel = '(Order Today!)';
  } else if (reorderDiff <= 7) {
    // Within 7 days
    reorderColor = 'text-yellow-600 font-bold';
    reorderLabel = `(In ${reorderDiff} days)`;
  }

  const handleDelete = () => {
    onDelete(prescription);
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-200 dark:border-gray-700 transition-shadow hover:shadow-xl">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{prescription.name}</h3>
            {category && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-gray-700 dark:text-gray-300">{category.name}</span>
              </div>
            )}
            {hasPhotos && (
              <button
                onClick={() => setIsPhotoGalleryOpen(true)}
                className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                aria-label="View photos"
                title={`View ${prescription.photoUrls?.length || 0} photo(s)`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-xs font-medium">
                  {prescription.photoUrls?.length || 0}
                </span>
              </button>
            )}
          </div>
          <span className="text-lg font-semibold text-blue-700 dark:text-blue-400 mt-2 md:mt-0">
            ~{Math.round(supplyInfo.currentSupply)} tablets left
          </span>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Re-order Date</p>
          <p className={`text-xl ${reorderColor}`}>
            {formatDisplayDate(supplyInfo.reorderDate)}{' '}
            <span className={`text-sm ${reorderColor}`}>{reorderLabel}</span>
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Est. Run Out Date</p>
          <p className="text-xl text-gray-700 dark:text-gray-300">
            {formatDisplayDate(supplyInfo.runOutDate)} ({supplyInfo.daysRemaining} days left)
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => onLogDelivery(prescription)}
          className="log-delivery-btn flex-1 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 shadow-md transition-all duration-200"
        >
          Log New Delivery
        </button>
        <button
          onClick={() => onViewLogs(prescription)}
          className="view-logs-btn flex-1 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 shadow-md transition-all duration-200"
        >
          View Logs ({prescription.supplyLog.length + 1})
        </button>
        <button
          onClick={handleDelete}
          className="delete-btn flex-1 bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 shadow-md transition-all duration-200"
        >
          Delete
        </button>
      </div>
      </div>

      {hasPhotos && (
        <PhotoGalleryModal
          isOpen={isPhotoGalleryOpen}
          onClose={() => setIsPhotoGalleryOpen(false)}
          photoUrls={prescription.photoUrls || []}
          prescriptionName={prescription.name}
        />
      )}
    </>
  );
}

