import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

export function NotificationPermissionPrompt() {
  const [show, setShow] = useState(false);
  const { hasPermission, requestPermission } = useNotifications();

  useEffect(() => {
    const hasAsked = localStorage.getItem('notificationPermissionAsked');
    if (!hasAsked && !hasPermission) {
      setTimeout(() => setShow(true), 2000);
    }
  }, [hasPermission]);

  const handleRequestPermission = async () => {
    await requestPermission();
    localStorage.setItem('notificationPermissionAsked', 'true');
    setShow(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('notificationPermissionAsked', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-white" />
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-2" translate="no">
            Ativar Notificações
          </h3>

          <p className="text-gray-600 mb-6" translate="no">
            Receba alertas instantâneos quando receber novas mensagens, chamados ou atualizações importantes!
          </p>

          <div className="space-y-3 w-full">
            <button
              onClick={handleRequestPermission}
              className="w-full bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-3 rounded-xl font-semibold hover:from-teal-700 hover:to-teal-800 transition-all shadow-lg hover:shadow-xl"
              translate="no"
            >
              Ativar Notificações
            </button>

            <button
              onClick={handleDismiss}
              className="w-full text-gray-500 hover:text-gray-700 py-2 transition"
              translate="no"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
