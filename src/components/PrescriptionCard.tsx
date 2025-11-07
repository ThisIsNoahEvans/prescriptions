import { Prescription, SupplyInfo } from '../types';
import { formatDisplayDate, dateDiffInDays, normalizeDate } from '../utils/dateUtils';

interface PrescriptionCardProps {
  prescription: Prescription;
  supplyInfo: SupplyInfo;
  onLogDelivery: (prescription: Prescription) => void;
  onViewLogs: (prescription: Prescription) => void;
  onDelete: (prescription: Prescription) => void;
}

export function PrescriptionCard({
  prescription,
  supplyInfo,
  onLogDelivery,
  onViewLogs,
  onDelete,
}: PrescriptionCardProps) {
  const today = normalizeDate(new Date());
  const reorderDiff = dateDiffInDays(supplyInfo.reorderDate, today);

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
    if (window.confirm(`Are you sure you want to delete ${prescription.name}? This cannot be undone.`)) {
      onDelete(prescription);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200 transition-shadow hover:shadow-xl">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-4">
        <h3 className="text-3xl font-bold text-gray-900">{prescription.name}</h3>
        <span className="text-lg font-semibold text-blue-700 mt-2 md:mt-0">
          ~{Math.round(supplyInfo.currentSupply)} tablets left
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Re-order Date</p>
          <p className={`text-xl ${reorderColor}`}>
            {formatDisplayDate(supplyInfo.reorderDate)}{' '}
            <span className={`text-sm ${reorderColor}`}>{reorderLabel}</span>
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Est. Run Out Date</p>
          <p className="text-xl text-gray-700">
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
  );
}

