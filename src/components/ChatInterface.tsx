import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, User, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name: string;
  is_mine: boolean;
}

interface ChatInterfaceProps {
  conversationId: string;
  currentUserId: string;
  otherUserName: string;
  onBack: () => void;
}

export default function ChatInterface({ conversationId, currentUserId, otherUserName, onBack }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [serviceRequestId, setServiceRequestId] = useState<string | null>(null);
  const [chatBlocked, setChatBlocked] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const paymentCheckInterval = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    checkPaymentStatusFromUrl();
    loadMessages();
    checkServiceRequestPaymentStatus();

    const interval = setInterval(loadMessages, 3000);
    return () => {
      clearInterval(interval);
      if (paymentCheckInterval.current) {
        clearInterval(paymentCheckInterval.current);
      }
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkPaymentStatusFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentParam = urlParams.get('payment');
    const serviceRequestParam = urlParams.get('service_request_id');

    if (paymentParam && serviceRequestParam) {
      setPaymentStatus(paymentParam);
      setServiceRequestId(serviceRequestParam);

      window.history.replaceState({}, document.title, window.location.pathname);

      if (paymentParam === 'success' || paymentParam === 'pending') {
        startPaymentPolling(serviceRequestParam);
      }
    }
  };

  const checkServiceRequestPaymentStatus = async () => {
    const { data: conversation } = await supabase
      .from('conversations')
      .select('service_request_id')
      .eq('id', conversationId)
      .maybeSingle();

    if (conversation?.service_request_id) {
      const { data: serviceRequest } = await supabase
        .from('service_requests')
        .select('payment_status, id')
        .eq('id', conversation.service_request_id)
        .maybeSingle();

      if (serviceRequest) {
        setServiceRequestId(serviceRequest.id);

        if (serviceRequest.payment_status === 'pending') {
          setChatBlocked(true);
          startPaymentPolling(serviceRequest.id);
        } else if (serviceRequest.payment_status === 'paid') {
          setChatBlocked(false);
          setPaymentStatus('success');
        }
      }
    }
  };

  const startPaymentPolling = (requestId: string) => {
    if (paymentCheckInterval.current) {
      clearInterval(paymentCheckInterval.current);
    }

    paymentCheckInterval.current = setInterval(async () => {
      const { data: serviceRequest } = await supabase
        .from('service_requests')
        .select('payment_status')
        .eq('id', requestId)
        .maybeSingle();

      if (serviceRequest?.payment_status === 'paid') {
        setPaymentStatus('success');
        setChatBlocked(false);
        if (paymentCheckInterval.current) {
          clearInterval(paymentCheckInterval.current);
        }
      }
    }, 3000);
  };

  const loadMessages = async () => {
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!messagesData) return;

    const formatted = await Promise.all(
      messagesData.map(async (msg: any) => {
        const { data: senderData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', msg.sender_id)
          .maybeSingle();

        return {
          id: msg.id,
          sender_id: msg.sender_id,
          content: msg.content,
          created_at: msg.created_at,
          sender_name: senderData?.full_name || 'Usuário',
          is_mine: msg.sender_id === currentUserId,
        };
      })
    );

    setMessages(formatted);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || chatBlocked) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: newMessage.trim(),
        message_type: 'text',
        read: false,
      });

      if (error) {
        console.error('Erro ao enviar mensagem:', error);
        return;
      }

      setNewMessage('');
      await loadMessages();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-b from-gray-50 to-white z-50">
      <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg flex-shrink-0">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-2 sm:gap-4">
          <button
            onClick={onBack}
            className="hover:bg-white/20 p-2 sm:p-2.5 rounded-xl transition-all duration-200 active:scale-95 flex-shrink-0"
          >
            <ArrowLeft size={18} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
              <User size={18} className="sm:w-[22px] sm:h-[22px] text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-sm sm:text-lg tracking-tight truncate">{otherUserName}</h2>
              <p className="text-[10px] sm:text-xs text-purple-100">Online</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4 max-w-4xl mx-auto w-full min-h-0">
        {paymentStatus && (
          <div className={`mb-4 p-4 rounded-xl border-2 ${
            paymentStatus === 'success' ? 'bg-green-50 border-green-200' :
            paymentStatus === 'pending' ? 'bg-yellow-50 border-yellow-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-3">
              {paymentStatus === 'success' && <CheckCircle className="text-green-600" size={24} />}
              {paymentStatus === 'pending' && <Clock className="text-yellow-600" size={24} />}
              {paymentStatus === 'failure' && <XCircle className="text-red-600" size={24} />}
              <div>
                <h3 className={`font-semibold ${
                  paymentStatus === 'success' ? 'text-green-800' :
                  paymentStatus === 'pending' ? 'text-yellow-800' :
                  'text-red-800'
                }`}>
                  {paymentStatus === 'success' && 'Pagamento Confirmado!'}
                  {paymentStatus === 'pending' && 'Aguardando Confirmação do Pagamento...'}
                  {paymentStatus === 'failure' && 'Pagamento Não Realizado'}
                </h3>
                <p className={`text-sm ${
                  paymentStatus === 'success' ? 'text-green-600' :
                  paymentStatus === 'pending' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {paymentStatus === 'success' && 'Agora você pode conversar com o profissional.'}
                  {paymentStatus === 'pending' && 'Verificando seu pagamento automaticamente...'}
                  {paymentStatus === 'failure' && 'Tente realizar o pagamento novamente.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {chatBlocked && (
          <div className="mb-4 p-4 rounded-xl bg-orange-50 border-2 border-orange-200">
            <div className="flex items-center gap-3">
              <Clock className="text-orange-600" size={24} />
              <div>
                <h3 className="font-semibold text-orange-800">Chat Bloqueado</h3>
                <p className="text-sm text-orange-600">
                  Complete o pagamento para desbloquear o chat e conversar com o profissional.
                </p>
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <Send size={24} className="sm:w-8 sm:h-8 text-gray-300" />
            </div>
            <p className="text-sm sm:text-base font-medium">Nenhuma mensagem ainda</p>
            <p className="text-xs sm:text-sm">Envie uma mensagem para começar</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm ${
                  msg.is_mine
                    ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-br-md'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                }`}
              >
                {!msg.is_mine && (
                  <div className="text-[10px] sm:text-xs font-semibold text-purple-600 mb-1">{msg.sender_name}</div>
                )}
                <div className="text-sm sm:text-[15px] leading-relaxed break-words">{msg.content}</div>
                <div className={`text-[10px] sm:text-[11px] mt-1 sm:mt-1.5 ${msg.is_mine ? 'text-purple-100' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-gray-200 shadow-lg flex-shrink-0">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex gap-2 sm:gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={chatBlocked ? "Complete o pagamento para enviar mensagens..." : "Digite sua mensagem..."}
            className="flex-1 px-3 sm:px-5 py-2.5 sm:py-3.5 text-sm sm:text-[15px] bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:text-gray-400"
            disabled={loading || chatBlocked}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !newMessage.trim() || chatBlocked}
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 font-medium"
          >
            <Send size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
