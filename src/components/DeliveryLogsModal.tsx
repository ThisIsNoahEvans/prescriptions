import { Modal } from './Modal';
import { Prescription } from '../types';
import { formatDisplayDate } from '../utils/dateUtils';

interface DeliveryLogsModalProps {
  prescription: Prescription | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DeliveryLogsModal({
  prescription,
  isOpen,
  onClose,
}: DeliveryLogsModalProps) {
  if (!prescription) {
    return null;
  }

  // Sort logs by date (newest first)
  const sortedLogs = [...prescription.supplyLog].sort((a, b) => {
    return b.date.toMillis() - a.date.toMillis();
  });

  const startDate = formatDisplayDate(prescription.startDate.toDate());

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl" contentClassName="p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">
              Delivery Logs
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              {prescription.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            aria-label="Close"
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
        </div>

        <div className="space-y-4">
          {/* Initial Supply */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Initial Supply
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Tracking started on {startDate}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {prescription.startSupply}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  tablets
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Logs */}
          {sortedLogs.length === 0 ? (
            <div className="text-center p-8 text-gray-500 dark:text-gray-400">
              <p>No deliveries logged yet.</p>
              <p className="text-sm mt-2">
                Log your first delivery to see it here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Deliveries ({sortedLogs.length})
              </h3>
              {sortedLogs.map((log, index) => (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Delivery Date
                      </p>
                      <p className="text-base text-gray-900 dark:text-white mt-1">
                        {formatDisplayDate(log.date.toDate())}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Quantity
                      </p>
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {log.quantity}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        tablets
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Delivered:
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {sortedLogs.reduce((sum, log) => sum + log.quantity, 0)}{' '}
                tablets
              </p>
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Supply (Initial + Deliveries):
              </p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {prescription.startSupply +
                  sortedLogs.reduce((sum, log) => sum + log.quantity, 0)}{' '}
                tablets
              </p>
            </div>
          </div>
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