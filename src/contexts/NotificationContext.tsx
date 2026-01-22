import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { NotificationService } from '../lib/notifications';

interface NotificationContextType {
  unreadCount: number;
  requestPermission: () => Promise<void>;
  hasPermission: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    checkNotificationPermission();
  }, []);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      subscribeToMessages();
    }
  }, [user]);

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }
  };

  const requestPermission = async () => {
    const granted = await NotificationService.requestPermission();
    setHasPermission(granted);
  };

  const loadUnreadCount = async () => {
    if (!user) return;

    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .or(`client_id.eq.${user.id},professional_id.eq.${user.id}`);

    if (!conversations) return;

    const conversationIds = conversations.map(c => c.id);

    if (conversationIds.length === 0) {
      setUnreadCount(0);
      NotificationService.updateBadge(0);
      return;
    }

    const { data: unreadMessages } = await supabase
      .from('messages')
      .select('id')
      .in('conversation_id', conversationIds)
      .neq('sender_id', user.id)
      .eq('read', false);

    const count = unreadMessages?.length || 0;
    setUnreadCount(count);
    NotificationService.updateBadge(count);
  };

  const subscribeToMessages = () => {
    if (!user) return;

    const channel = supabase
      .channel('all-messages-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload: any) => {
          if (payload.new.sender_id !== user.id) {
            const { data: conversation } = await supabase
              .from('conversations')
              .select('id, client_id, professional_id')
              .eq('id', payload.new.conversation_id)
              .maybeSingle();

            if (conversation &&
                (conversation.client_id === user.id || conversation.professional_id === user.id)) {

              const { data: senderProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', payload.new.sender_id)
                .maybeSingle();

              const senderName = senderProfile?.full_name || 'Usuário';

              NotificationService.showNotification(
                `Nova mensagem de ${senderName}`,
                payload.new.content.substring(0, 100),
                '/icon-192.png'
              );

              loadUnreadCount();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'service_requests'
        },
        async (payload: any) => {
          if (payload.new.professional_id === user.id) {
            const { data: clientProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', payload.new.client_id)
              .maybeSingle();

            const clientName = clientProfile?.full_name || 'Cliente';

            NotificationService.showNotification(
              'Novo Chamado Recebido!',
              `${clientName} solicitou um atendimento`,
              '/icon-192.png'
            );

            NotificationService.playNotificationSound();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_requests'
        },
        async (payload: any) => {
          if (payload.new.client_id === user.id &&
              payload.old.status !== 'accepted' &&
              payload.new.status === 'accepted') {

            const { data: professionalProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', payload.new.professional_id)
              .maybeSingle();

            const professionalName = professionalProfile?.full_name || 'Profissional';

            NotificationService.showNotification(
              'Chamado Aceito!',
              `${professionalName} aceitou seu chamado`,
              '/icon-192.png'
            );

            NotificationService.playNotificationSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return (
    <NotificationContext.Provider value={{ unreadCount, requestPermission, hasPermission }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
