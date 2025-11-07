import { useState, useEffect, FormEvent } from 'react';
import { Timestamp } from 'firebase/firestore';
import { addPrescription } from '../services/prescriptionService';
import { uploadPrescriptionPhoto } from '../services/storageService';
import { formatDateYYYYMMDD } from '../utils/dateUtils';
import { Prescription } from '../types';
import { PhotoUpload } from './PhotoUpload';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

interface AddPrescriptionFormProps {
  userId: string;
  onPrescriptionAdded: () => void;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export function AddPrescriptionForm({
  userId,
  onPrescriptionAdded,
  onClose,
  onError,
  onSuccess,
}: AddPrescriptionFormProps) {
  const [name, setName] = useState('');
  const [packSize, setPackSize] = useState('');
  const [dailyDose, setDailyDose] = useState('1');
  const [startDate, setStartDate] = useState(formatDateYYYYMMDD(new Date()));
  const [startSupply, setStartSupply] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoUploadResetKey, setPhotoUploadResetKey] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Lock body scroll when form is open
  useEffect(() => {
    // Lock body scroll with scrollbar compensation
    lockBodyScroll();
    
    // Trigger animation after mount
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => {
      // Restore body scroll on unmount
      unlockBodyScroll();
    };
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setIsVisible(false);
    // Restore body scroll immediately when closing starts
    unlockBodyScroll();
    // Wait for animation to complete before closing
    setTimeout(() => {
      onClose();
    }, 300); // Match duration-300
  };

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
      // Upload photos first
      let photoUrls: string[] = [];
      if (selectedPhotos.length > 0) {
        // We need to create the prescription first to get its ID, then upload photos
        // So we'll create it without photos, then update it with photo URLs
        const prescriptionData: Omit<Prescription, 'id' | 'createdAt' | 'supplyLog'> = {
          name,
          packSize: packSizeNum,
          dailyDose: dailyDoseNum,
          startDate: Timestamp.fromDate(startDateObj),
          startSupply: startSupplyNum,
        };

        const prescriptionId = await addPrescription(userId, prescriptionData);

        // Upload photos
        const uploadPromises = selectedPhotos.map((file) =>
          uploadPrescriptionPhoto(userId, prescriptionId, file)
        );
        photoUrls = await Promise.all(uploadPromises);

        // Update prescription with photo URLs
        const { updateDoc, doc } = await import('firebase/firestore');
        const { getFirebaseDb } = await import('../firebase/config');
        const db = getFirebaseDb();
        const prescriptionRef = doc(db, 'users', userId, 'prescriptions', prescriptionId);
        await updateDoc(prescriptionRef, { photoUrls });
      } else {
        // No photos, just create the prescription
        await addPrescription(userId, {
          name,
          packSize: packSizeNum,
          dailyDose: dailyDoseNum,
          startDate: Timestamp.fromDate(startDateObj),
          startSupply: startSupplyNum,
        });
      }

      // Reset form
      setName('');
      setPackSize('');
      setDailyDose('1');
      setStartDate(formatDateYYYYMMDD(new Date()));
      setStartSupply('0');
      setSelectedPhotos([]);
      setPhotoUploadResetKey((prev) => prev + 1); // Force PhotoUpload to reset
      
      onSuccess(`${name} added successfully!`);
      // Close with animation
      handleClose();
      onPrescriptionAdded();
    } catch (error) {
      console.error('Error adding prescription:', error);
      onError('Error adding prescription. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 bg-gray-100 dark:bg-gray-900 overflow-y-auto transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div 
        className={`min-h-full bg-white dark:bg-gray-800 shadow-xl transition-transform duration-300 ease-out ${
          isVisible ? 'translate-y-0' : 'translate-y-4'
        }`}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between z-10 shadow-sm">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
            Add New Prescription
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
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
        
        <div className="max-w-2xl mx-auto p-4 sm:p-6 md:p-8 pb-8 sm:pb-12">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Medication Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="e.g., Atorvastatin"
          />
        </div>

        <div>
          <label htmlFor="pack-size" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Standard Pack Size
          </label>
          <input
            type="number"
            id="pack-size"
            min="1"
            value={packSize}
            onChange={(e) => setPackSize(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="e.g., 30"
          />
        </div>

        <div>
          <label htmlFor="daily-dose" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="e.g., 1 or 0.5"
          />
        </div>

        <div>
          <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tracking Start Date
          </label>
          <input
            type="date"
            id="start-date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="start-supply" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Supply on Start Date
          </label>
          <input
            type="number"
            id="start-supply"
            min="0"
            value={startSupply}
            onChange={(e) => setStartSupply(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="How many tablets you have now"
          />
        </div>

        <div className="md:col-span-2">
          <PhotoUpload
            onPhotosChange={setSelectedPhotos}
            maxPhotos={5}
            existingPhotos={0}
            resetKey={photoUploadResetKey}
          />
        </div>

        <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 px-6 rounded-lg shadow-sm hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-blue-600 dark:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Prescription'}
          </button>
        </div>
      </form>
        </div>
      </div>
    </div>
  );
}

