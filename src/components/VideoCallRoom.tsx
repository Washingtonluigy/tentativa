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
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
          <div className="text-center mb-8">
            <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Chamada de Vídeo
            </h2>
            <p className="text-gray-600">
              Use uma das opções abaixo para participar da chamada
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <h3 className="font-bold text-lg text-gray-900 mb-2 flex items-center gap-2">
                <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                Abrir em Nova Aba (Recomendado)
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                A chamada abrirá em uma nova aba do navegador com todos os controles de vídeo
              </p>
              <button
                onClick={openInNewTab}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-6 h-6" />
                Abrir Chamada em Nova Aba
              </button>
            </div>

            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-lg text-gray-900 mb-2 flex items-center gap-2">
                <span className="bg-gray-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                Copiar Link da Chamada
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Compartilhe este link com outros participantes
              </p>
              <div className="bg-white border border-gray-300 rounded-lg p-3 mb-3 break-all text-sm text-gray-700">
                {videoCallLink}
              </div>
              <button
                onClick={copyLink}
                className="w-full bg-gray-700 hover:bg-gray-800 text-white py-3 px-6 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    Link Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copiar Link
                  </>
                )}
              </button>
            </div>

            {showInstructions && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 animate-fadeIn">
                <p className="text-sm text-yellow-800">
                  <strong>Dica:</strong> Certifique-se de permitir o acesso à câmera e microfone quando solicitado pelo navegador.
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-4 px-6 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <X className="w-6 h-6" />
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
