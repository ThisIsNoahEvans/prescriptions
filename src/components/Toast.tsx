import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  isError?: boolean;
  onClose: () => void;
}

export function Toast({ message, isError = false, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-8 right-8 ${
        isError ? 'bg-red-600' : 'bg-gray-900'
      } text-white py-3 px-6 rounded-lg shadow-lg transition-all duration-300 transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <span>{message}</span>
    </div>
  );
}

