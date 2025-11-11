import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, User } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    if (!newMessage.trim()) return;

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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="hover:bg-white/20 p-2.5 rounded-xl transition-all duration-200 active:scale-95"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <User size={22} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-lg tracking-tight">{otherUserName}</h2>
              <p className="text-xs text-purple-100">Online</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-4xl mx-auto w-full min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Send size={32} className="text-gray-300" />
            </div>
            <p className="text-base font-medium">Nenhuma mensagem ainda</p>
            <p className="text-sm">Envie uma mensagem para começar</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                  msg.is_mine
                    ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-br-md'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                }`}
              >
                {!msg.is_mine && (
                  <div className="text-xs font-semibold text-purple-600 mb-1.5">{msg.sender_name}</div>
                )}
                <div className="text-[15px] leading-relaxed break-words">{msg.content}</div>
                <div className={`text-[11px] mt-1.5 ${msg.is_mine ? 'text-purple-100' : 'text-gray-400'}`}>
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            className="flex-1 px-5 py-3.5 text-[15px] bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !newMessage.trim()}
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3.5 rounded-2xl hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 font-medium"
          >
            <Send size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
