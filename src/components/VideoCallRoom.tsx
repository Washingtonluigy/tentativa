import React from 'react';
import { X } from 'lucide-react';

interface VideoCallRoomProps {
  roomId: string;
  userName: string;
  onClose: () => void;
}

export function VideoCallRoom({ roomId, userName, onClose }: VideoCallRoomProps) {
  const encodedUserName = encodeURIComponent(userName);
  const encodedRoomId = encodeURIComponent(roomId);

  const jitsiUrl = `https://meet.jit.si/${encodedRoomId}#userInfo.displayName="${encodedUserName}"&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.prejoinPageEnabled=false`;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex-1 relative">
        <iframe
          src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full border-0"
          title="Chamada de Vídeo"
        />
      </div>

      <div className="bg-gray-900 p-3 sm:p-4 flex items-center justify-center">
        <button
          onClick={onClose}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-medium transition-all shadow-lg flex items-center gap-2"
          title="Sair da Chamada"
        >
          <X className="w-5 h-5" />
          <span className="hidden sm:inline">Sair da Chamada</span>
        </button>
      </div>
    </div>
  );
}
