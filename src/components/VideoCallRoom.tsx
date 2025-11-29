import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, Video, VideoOff, MessageSquare, Phone } from 'lucide-react';

interface VideoCallRoomProps {
  roomId: string;
  userName: string;
  onClose: () => void;
}

export function VideoCallRoom({ roomId, userName, onClose }: VideoCallRoomProps) {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (!jitsiContainerRef.current) return;

    const loadJitsiScript = () => {
      return new Promise((resolve, reject) => {
        if ((window as any).JitsiMeetExternalAPI) {
          resolve((window as any).JitsiMeetExternalAPI);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => resolve((window as any).JitsiMeetExternalAPI);
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    loadJitsiScript()
      .then((JitsiMeetExternalAPI: any) => {
        const domain = 'meet.jit.si';
        const options = {
          roomName: roomId,
          width: '100%',
          height: '100%',
          parentNode: jitsiContainerRef.current,
          userInfo: {
            displayName: userName,
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            enableWelcomePage: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'chat',
              'desktop',
              'fullscreen',
              'hangup',
              'profile',
              'settings',
              'videoquality',
            ],
            MOBILE_APP_PROMO: false,
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
          },
        };

        const jitsiApi = new JitsiMeetExternalAPI(domain, options);
        setApi(jitsiApi);

        jitsiApi.addEventListener('videoConferenceLeft', () => {
          onClose();
        });

        jitsiApi.addEventListener('readyToClose', () => {
          onClose();
        });

        return () => {
          jitsiApi?.dispose();
        };
      })
      .catch((error) => {
        console.error('Erro ao carregar Jitsi:', error);
        alert('Erro ao iniciar chamada de vídeo. Tente novamente.');
      });

    return () => {
      if (api) {
        api.dispose();
      }
    };
  }, [roomId, userName, onClose]);

  const toggleMute = () => {
    if (api) {
      if (isMuted) {
        api.executeCommand('unmuteAudio');
      } else {
        api.executeCommand('muteAudio');
      }
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (api) {
      if (isVideoOff) {
        api.executeCommand('unmuteVideo');
      } else {
        api.executeCommand('muteVideo');
      }
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleChat = () => {
    if (api) {
      api.executeCommand('toggleChat');
      setShowChat(!showChat);
    }
  };

  const endCall = () => {
    if (api) {
      api.executeCommand('hangup');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex-1 relative">
        <div ref={jitsiContainerRef} className="w-full h-full" />
      </div>

      <div className="bg-gray-900 p-4 flex items-center justify-center gap-4">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition-all ${
            isMuted
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title={isMuted ? 'Desmutar' : 'Mutar'}
        >
          {isMuted ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-all ${
            isVideoOff
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title={isVideoOff ? 'Ligar Câmera' : 'Desligar Câmera'}
        >
          {isVideoOff ? (
            <VideoOff className="w-6 h-6 text-white" />
          ) : (
            <Video className="w-6 h-6 text-white" />
          )}
        </button>

        <button
          onClick={toggleChat}
          className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all"
          title="Chat"
        >
          <MessageSquare className="w-6 h-6 text-white" />
        </button>

        <button
          onClick={endCall}
          className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-all"
          title="Encerrar Chamada"
        >
          <Phone className="w-6 h-6 text-white transform rotate-135" />
        </button>

        <button
          onClick={onClose}
          className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all ml-auto"
          title="Fechar"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}
