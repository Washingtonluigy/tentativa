import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import logo from '../assets/Design sem nome (1).png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                               (window.navigator as any).standalone === true;

    setIsIOS(isIOSDevice);
    setIsStandalone(isInStandaloneMode);

    const hasSeenPrompt = localStorage.getItem('pwa-install-prompt-seen');

    if (!isInStandaloneMode && !hasSeenPrompt) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!hasSeenPrompt) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
      localStorage.setItem('pwa-install-prompt-seen', 'true');
    }
  };

  const handleClose = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-prompt-seen', 'true');
  };

  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-fade-in">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center">
          <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg p-2">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2" translate="no">
            Instale nosso App
          </h2>
          <p className="text-gray-600 mb-6" translate="no">
            Tenha acesso rápido e offline aos nossos serviços
          </p>

          {isIOS ? (
            <div className="text-left space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center" translate="no">
                  <Share className="w-5 h-5 mr-2" />
                  Como instalar no iOS:
                </h3>
                <ol className="space-y-2 text-sm text-blue-800" translate="no">
                  <li className="flex items-start">
                    <span className="font-bold mr-2">1.</span>
                    <span>Toque no botão de <strong>Compartilhar</strong> <Share className="w-4 h-4 inline" /> na barra inferior do Safari</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">2.</span>
                    <span>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">3.</span>
                    <span>Toque em <strong>"Adicionar"</strong> no canto superior direito</span>
                  </li>
                </ol>
              </div>
              <button
                onClick={handleClose}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-md"
                translate="no"
              >
                Entendi!
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {deferredPrompt ? (
                <button
                  onClick={handleInstallClick}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-md flex items-center justify-center space-x-2"
                  translate="no"
                >
                  <Download className="w-5 h-5" />
                  <span>Instalar Agora</span>
                </button>
              ) : (
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg" translate="no">
                  Para instalar, use o menu do navegador e selecione "Instalar aplicativo" ou "Adicionar à tela inicial"
                </div>
              )}
              <button
                onClick={handleClose}
                className="w-full text-gray-600 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                translate="no"
              >
                Agora não
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500" translate="no">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Acesso rápido</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Funciona offline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
