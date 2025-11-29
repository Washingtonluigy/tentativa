import React, { useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

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

  const isError = message.toLowerCase().includes('erro');

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-4" style={{ zIndex: 99999 }}>
      <div
        className="absolute inset-0 bg-black bg-opacity-50 animate-fade-in backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 text-center animate-scale-in w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
          isError ? 'bg-red-100' : 'bg-green-100'
        }`}>
          {isError ? (
            <XCircle className="w-12 h-12 text-red-500" />
          ) : (
            <CheckCircle className="w-12 h-12 text-green-500" />
          )}
        </div>

        <h3 className={`text-xl font-bold mb-2 ${
          isError ? 'text-red-600' : 'text-green-600'
        }`}>
          {isError ? 'Ops!' : 'Sucesso!'}
        </h3>

        <p className="text-gray-700 mb-6 text-base">
          {message}
        </p>

        <button
          onClick={onClose}
          className={`px-8 py-3 rounded-full font-semibold transition-all transform hover:scale-105 shadow-lg ${
            isError
              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
              : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
          }`}
        >
          OK
        </button>
      </div>
    </div>
  );
}
