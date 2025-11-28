import React, { useEffect } from 'react';

interface NotificationPopupProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
  autoCloseDelay?: number;
}

export function NotificationPopup({
  isOpen,
  message,
  onClose,
  autoCloseDelay = 3000
}: NotificationPopupProps) {
  useEffect(() => {
    if (isOpen && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-4" style={{ zIndex: 99999 }}>
      <div
        className="absolute inset-0 bg-black bg-opacity-90 animate-fade-in"
        onClick={onClose}
      />

      <div className="relative z-10 text-center animate-scale-in w-full max-w-md">
        <p className="text-white text-sm mb-32 px-4">
          {message}
        </p>

        <button
          onClick={onClose}
          className="bg-gradient-to-r from-orange-300 to-orange-400 text-gray-800 px-12 py-3 rounded-full font-medium hover:from-orange-400 hover:to-orange-500 transition-all transform hover:scale-105 shadow-lg"
        >
          OK
        </button>
      </div>
    </div>
  );
}
