import { useState, FormEvent, useEffect } from 'react';
import { Prescription } from '../types';
import { formatDateYYYYMMDD } from '../utils/dateUtils';

interface LogDeliveryModalProps {
  prescription: Prescription | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (prescriptionId: string, deliveryDate: Date, quantity: number) => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export function LogDeliveryModal({
  prescription,
  isOpen,
  onClose,
  onSave,
  onError,
  onSuccess,
}: LogDeliveryModalProps) {
  const [deliveryDate, setDeliveryDate] = useState(formatDateYYYYMMDD(new Date()));
  const [quantity, setQuantity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (prescription && isOpen) {
      setQuantity(prescription.packSize.toString());
      setDeliveryDate(formatDateYYYYMMDD(new Date()));
    }
  }, [prescription, isOpen]);

  if (!isOpen || !prescription) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const deliveryDateObj = new Date(deliveryDate);
    const quantityNum = Number(quantity);

    if (isNaN(deliveryDateObj.getTime()) || isNaN(quantityNum) || quantityNum <= 0) {
      onError('Please enter a valid date and quantity.');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSave(prescription.id, deliveryDateObj, quantityNum);
      onSuccess(`Delivery logged for ${prescription.name}.`);
      onClose();
      setQuantity(prescription.packSize.toString());
      setDeliveryDate(formatDateYYYYMMDD(new Date()));
    } catch (error) {
      console.error('Error logging delivery:', error);
      onError('Error logging delivery. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={`modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 transition-opacity duration-250 ${
        isOpen ? 'visible opacity-100' : 'invisible opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`modal-content bg-white w-full max-w-lg p-8 rounded-2xl shadow-2xl transition-transform duration-250 ${
          isOpen ? 'scale-100' : 'scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-semibold mb-2">Log Delivery</h2>
        <p className="text-lg mb-6 text-gray-700">{prescription.name}</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label
              htmlFor="delivery-date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Delivery Date
            </label>
            <input
              type="date"
              id="delivery-date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="mb-8">
            <label
              htmlFor="delivery-quantity"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Quantity Delivered
            </label>
            <input
              type="number"
              id="delivery-quantity"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Defaults to pack size"
            />
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Delivery'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

