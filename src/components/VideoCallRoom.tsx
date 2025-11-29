import React, { useState, useEffect } from 'react';
import { X, AlertCircle, ExternalLink, Copy, Check } from 'lucide-react';

interface VideoCallRoomProps {
  roomId: string;
  userName: string;
  onClose: () => void;
}

export function VideoCallRoom({ roomId, userName, onClose }: VideoCallRoomProps) {
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const encodedRoomId = encodeURIComponent(roomId);
  const videoCallLink = `https://meet.jit.si/${encodedRoomId}`;

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInstructions(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(videoCallLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('Link: ' + videoCallLink);
    }
  };

  const openInNewTab = () => {
    window.open(videoCallLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Chamada de Vídeo
            </h2>
            <p className="text-gray-600 text-sm">
              Use uma das opções abaixo para participar da chamada
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <h3 className="font-bold text-base text-gray-900 mb-2 flex items-center gap-2">
                <span className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs">1</span>
                Abrir em Nova Aba (Recomendado)
              </h3>
              <p className="text-gray-600 text-xs mb-3">
                A chamada abrirá em uma nova aba do navegador com todos os controles de vídeo
              </p>
              <button
                onClick={openInNewTab}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm"
              >
                <ExternalLink className="w-5 h-5" />
                Abrir Chamada em Nova Aba
              </button>
            </div>

            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
              <h3 className="font-bold text-base text-gray-900 mb-2 flex items-center gap-2">
                <span className="bg-gray-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs">2</span>
                Copiar Link da Chamada
              </h3>
              <p className="text-gray-600 text-xs mb-3">
                Compartilhe este link com outros participantes
              </p>
              <div className="bg-white border border-gray-300 rounded-lg p-2 mb-2 break-all text-xs text-gray-700">
                {videoCallLink}
              </div>
              <button
                onClick={copyLink}
                className="w-full bg-gray-700 hover:bg-gray-800 text-white py-2.5 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Link Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar Link
                  </>
                )}
              </button>
            </div>

            {showInstructions && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <p className="text-xs text-yellow-800">
                  <strong>Dica:</strong> Certifique-se de permitir o acesso à câmera e microfone quando solicitado pelo navegador.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm"
            >
              <X className="w-5 h-5" />
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
