import { useState, useEffect } from 'react';
import { Prescription, Category } from '../types';
import { calculateSupplyInfo } from '../utils/supplyCalculator';
import { subscribeToCategories } from '../services/categoryService';
import { PrescriptionCard } from './PrescriptionCard';

interface PrescriptionListProps {
  userId: string;
  prescriptions: Prescription[];
  isLoading: boolean;
  onLogDelivery: (prescription: Prescription) => void;
  onViewLogs: (prescription: Prescription) => void;
  onDelete: (prescription: Prescription) => void;
}

export function PrescriptionList({
  userId,
  prescriptions,
  isLoading,
  onLogDelivery,
  onViewLogs,
  onDelete,
}: PrescriptionListProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToCategories(userId, (categoriesList) => {
      setCategories(categoriesList);
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);
  if (isLoading) {
    return (
      <div className="text-center p-8 bg-white rounded-lg shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Loading prescriptions...</p>
        </div>
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <div className="text-center p-8 bg-white rounded-lg shadow-sm text-gray-500">
        You haven't added any prescriptions yet. Use the form above to get started.
      </div>
    );
  }

  // Sort prescriptions by re-order date (most urgent first)
  const sortedPrescriptions = [...prescriptions].sort((a, b) => {
    const infoA = calculateSupplyInfo(a);
    const infoB = calculateSupplyInfo(b);
    return infoA.reorderDate.getTime() - infoB.reorderDate.getTime();
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8 items-stretch">
      {sortedPrescriptions.map((prescription) => {
        const supplyInfo = calculateSupplyInfo(prescription);
        return (
          <PrescriptionCard
            key={prescription.id}
            prescription={prescription}
            supplyInfo={supplyInfo}
            categories={categories}
            onLogDelivery={onLogDelivery}
            onViewLogs={onViewLogs}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}

