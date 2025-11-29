import { useState, useEffect } from 'react';
import { MessageCircle, User, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ChatInterface from '../../components/ChatInterface';

interface Conversation {
  id: string;
  professional_id: string;
  professional_name: string;
  last_message: string;
  last_message_time: string;
  unread: boolean;
}

interface MessagesProps {
  selectedProfessionalId?: string | null;
}

export default function Messages({ selectedProfessionalId }: MessagesProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (selectedProfessionalId && conversations.length > 0) {
      const conv = conversations.find(c => c.professional_id === selectedProfessionalId);
      if (conv) {
        setSelectedConversation(conv);
      } else {
        createConversationWithProfessional(selectedProfessionalId);
      }
    }
  }, [selectedProfessionalId, conversations]);

  const loadConversations = async () => {
    if (!user?.id) return;

    const { data: convData } = await supabase
      .from('conversations')
      .select('*')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false });

    if (!convData) {
      setLoading(false);
      return;
    }

    const formatted = await Promise.all(
      convData.map(async (conv: any) => {
        const { data: professionalData } = await supabase
          .from('users')
          .select('id')
          .eq('id', conv.professional_id)
          .maybeSingle();

        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', conv.professional_id)
          .maybeSingle();

        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at, read')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          id: conv.id,
          professional_id: conv.professional_id,
          professional_name: profileData?.full_name || 'Profissional',
          last_message: lastMsg?.content || 'Sem mensagens',
          last_message_time: lastMsg?.created_at || conv.created_at,
          unread: lastMsg ? !lastMsg.read : false,
        };
      })
    );

    setConversations(formatted);
    setLoading(false);
  };

  const createConversationWithProfessional = async (professionalId: string) => {
    if (!user?.id) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', professionalId)
      .maybeSingle();

    const { data: existingConv } = await supabase
      .from('conversations')
      .select('*')
      .eq('client_id', user.id)
      .eq('professional_id', professionalId)
      .maybeSingle();

    if (existingConv) {
      setSelectedConversation({
        id: existingConv.id,
        professional_id: existingConv.professional_id,
        professional_name: profileData?.full_name || 'Profissional',
        last_message: 'Sem mensagens',
        last_message_time: existingConv.created_at,
        unread: false,
      });
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          client_id: user.id,
          professional_id: professionalId,
        })
        .select()
        .single();

      if (newConv) {
        setSelectedConversation({
          id: newConv.id,
          professional_id: newConv.professional_id,
          professional_name: profileData?.full_name || 'Profissional',
          last_message: 'Sem mensagens',
          last_message_time: newConv.created_at,
          unread: false,
        });
        loadConversations();
      }
    }
  };

  if (selectedConversation) {
    return (
      <ChatInterface
        conversationId={selectedConversation.id}
        currentUserId={user?.id || ''}
        otherUserName={selectedConversation.professional_name}
        onBack={() => setSelectedConversation(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-20">
      <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
        <p className="text-gray-600 text-xs sm:text-sm font-medium">Mensagens</p>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        {loading ? (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-6 sm:p-8 text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div>
            </div>
            <p className="text-gray-500 mt-3 text-xs sm:text-sm">Carregando conversas...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5">
              <MessageCircle size={32} className="sm:w-10 sm:h-10 text-purple-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Nenhuma conversa ainda</h3>
            <p className="text-sm sm:text-base text-gray-500">
              Suas conversas com profissionais aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-md overflow-hidden">
            {conversations.map((conv, index) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full text-left p-3 sm:p-5 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 transition-all duration-200 ${
                  index !== 0 ? 'border-t border-gray-100' : ''
                } ${conv.unread ? 'bg-purple-50/30' : ''}`}
              >
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                    conv.unread
                      ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                      : 'bg-gradient-to-br from-gray-200 to-gray-300'
                  }`}>
                    <User size={18} className="sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                      <h3 className="font-semibold text-sm sm:text-base text-gray-800 truncate">
                        {conv.professional_name}
                      </h3>
                      {conv.unread && (
                        <span className="flex-shrink-0 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-purple-500 rounded-full animate-pulse"></span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">
                      {conv.last_message}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 sm:gap-2 flex-shrink-0">
                    <span className="text-[10px] sm:text-xs text-gray-400 font-medium whitespace-nowrap">
                      {new Date(conv.last_message_time).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short'
                      })}
                    </span>
                    <ChevronRight size={14} className="sm:w-[18px] sm:h-[18px] text-gray-400" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
