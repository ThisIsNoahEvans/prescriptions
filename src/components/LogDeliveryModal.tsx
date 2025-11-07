import { useState, FormEvent, useEffect } from 'react';
import { Prescription } from '../types';
import { formatDateYYYYMMDD } from '../utils/dateUtils';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

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
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (prescription && isOpen) {
      setQuantity(prescription.packSize.toString());
      setDeliveryDate(formatDateYYYYMMDD(new Date()));
      setIsClosing(false);
      setIsVisible(false);
      // Lock body scroll with scrollbar compensation
      lockBodyScroll();
      // Trigger animation after mount
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
      unlockBodyScroll();
    }

    return () => {
      unlockBodyScroll();
    };
  }, [prescription, isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setIsVisible(false);
    // Restore body scroll immediately when closing starts
    unlockBodyScroll();
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // Don't render if not open and not closing (allows closing animation to complete)
  if ((!isOpen || !prescription) && !isClosing) {
    return null;
  }

  // Don't render content if prescription is null during closing animation
  if (!prescription) {
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
      handleClose();
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
    if (e.target === e.currentTarget && !isSubmitting) {
      handleClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white dark:bg-gray-800 w-full max-w-lg p-8 rounded-2xl shadow-2xl transition-transform duration-300 ease-out ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">Log Delivery</h2>
        <p className="text-lg mb-6 text-gray-700 dark:text-gray-300">{prescription.name}</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label
              htmlFor="delivery-date"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Delivery Date
            </label>
            <input
              type="date"
              id="delivery-date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="mb-8">
            <label
              htmlFor="delivery-quantity"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
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
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Defaults to pack size"
            />
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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

