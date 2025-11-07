import { useState, FormEvent } from 'react';
import { Timestamp } from 'firebase/firestore';
import { addPrescription } from '../services/prescriptionService';
import { formatDateYYYYMMDD } from '../utils/dateUtils';
import { Prescription } from '../types';

interface AddPrescriptionFormProps {
  userId: string;
  onPrescriptionAdded: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export function AddPrescriptionForm({
  userId,
  onPrescriptionAdded,
  onError,
  onSuccess,
}: AddPrescriptionFormProps) {
  const [name, setName] = useState('');
  const [packSize, setPackSize] = useState('');
  const [dailyDose, setDailyDose] = useState('1');
  const [startDate, setStartDate] = useState(formatDateYYYYMMDD(new Date()));
  const [startSupply, setStartSupply] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name || !packSize || !dailyDose || !startDate) {
      onError('Please fill out all required fields.');
      return;
    }

    const packSizeNum = Number(packSize);
    const dailyDoseNum = Number(dailyDose);
    const startSupplyNum = Number(startSupply);
    const startDateObj = new Date(startDate);

    if (
      isNaN(packSizeNum) ||
      packSizeNum <= 0 ||
      isNaN(dailyDoseNum) ||
      dailyDoseNum <= 0 ||
      isNaN(startSupplyNum) ||
      startSupplyNum < 0 ||
      isNaN(startDateObj.getTime())
    ) {
      onError('Please enter valid values for all fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const prescriptionData: Omit<Prescription, 'id' | 'createdAt' | 'supplyLog'> = {
        name,
        packSize: packSizeNum,
        dailyDose: dailyDoseNum,
        startDate: Timestamp.fromDate(startDateObj),
        startSupply: startSupplyNum,
      };

      await addPrescription(userId, prescriptionData);
      onSuccess(`${name} added successfully!`);

      // Reset form
      setName('');
      setPackSize('');
      setDailyDose('1');
      setStartDate(formatDateYYYYMMDD(new Date()));
      setStartSupply('0');
      onPrescriptionAdded();
    } catch (error) {
      console.error('Error adding prescription:', error);
      onError('Error adding prescription. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg mb-8 border border-gray-200">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Add New Prescription</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Medication Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Atorvastatin"
          />
        </div>

        <div>
          <label htmlFor="pack-size" className="block text-sm font-medium text-gray-700 mb-1">
            Standard Pack Size
          </label>
          <input
            type="number"
            id="pack-size"
            min="1"
            value={packSize}
            onChange={(e) => setPackSize(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 30"
          />
        </div>

        <div>
          <label htmlFor="daily-dose" className="block text-sm font-medium text-gray-700 mb-1">
            Daily Dose (Tablets)
          </label>
          <input
            type="number"
            id="daily-dose"
            min="0.1"
            step="0.1"
            value={dailyDose}
            onChange={(e) => setDailyDose(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 1 or 0.5"
          />
        </div>

        <div>
          <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
            Tracking Start Date
          </label>
          <input
            type="date"
            id="start-date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="start-supply" className="block text-sm font-medium text-gray-700 mb-1">
            Supply on Start Date
          </label>
          <input
            type="number"
            id="start-supply"
            min="0"
            value={startSupply}
            onChange={(e) => setStartSupply(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="How many tablets you have now"
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto bg-blue-600 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Prescription'}
          </button>
        </div>
      </form>
    </div>
  );
}

