import React, { useState, useEffect } from 'react';
import { Clock, Check, X, User, MapPin, Phone, Video, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ServiceRequest {
  id: string;
  client_name: string;
  client_phone: string;
  client_city: string;
  service_type: string;
  status: string;
  notes: string;
  created_at: string;
}

export function ServiceRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);

  useEffect(() => {
    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('service_requests')
      .select(`
        id,
        service_type,
        status,
        notes,
        created_at,
        users!service_requests_client_id_fkey(
          id,
          profiles(full_name, phone, city)
        )
      `)
      .eq('professional_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      const formatted = data.map((r: any) => ({
        id: r.id,
        client_name: r.users?.profiles?.full_name || 'Cliente',
        client_phone: r.users?.profiles?.phone || 'N/A',
        client_city: r.users?.profiles?.city || 'N/A',
        service_type: r.service_type,
        status: r.status,
        notes: r.notes,
        created_at: r.created_at,
      }));
      setRequests(formatted);
    }
  };

  const handleAccept = async (requestId: string, clientId: string) => {
    await supabase
      .from('service_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    const { data: conversationData } = await supabase
      .from('conversations')
      .select('id')
      .eq('request_id', requestId)
      .maybeSingle();

    if (!conversationData && user) {
      await supabase
        .from('conversations')
        .insert([{
          request_id: requestId,
          client_id: clientId,
          professional_id: user.id,
        }]);
    }

    loadRequests();
  };

  const handleReject = async (requestId: string) => {
    if (confirm('Deseja realmente recusar este chamado?')) {
      await supabase
        .from('service_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      loadRequests();
    }
  };

  const getServiceTypeIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-5 h-5" />;
      case 'video_call':
        return <Video className="w-5 h-5" />;
      case 'in_person':
        return <MapPin className="w-5 h-5" />;
      default:
        return <Phone className="w-5 h-5" />;
    }
  };

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'message':
        return 'Atendimento por Mensagem';
      case 'video_call':
        return 'Atendimento por Vídeo';
      case 'in_person':
        return 'Atendimento Presencial';
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-700';
      case 'accepted':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'accepted':
        return 'Aceito';
      case 'rejected':
        return 'Recusado';
      case 'completed':
        return 'Concluído';
      default:
        return status;
    }
  };

  return (
    <div className="p-4 pb-20">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Chamados</h2>

      <div className="space-y-4">
        {requests.map((request) => (
          <div
            key={request.id}
            className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-3 rounded-full">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{request.client_name}</h3>
                  <p className="text-sm text-gray-600">{request.client_phone}</p>
                  <p className="text-sm text-gray-500">{request.client_city}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                {getStatusLabel(request.status)}
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 text-teal-600 mb-1">
                {getServiceTypeIcon(request.service_type)}
                <span className="font-medium text-sm">
                  {getServiceTypeLabel(request.service_type)}
                </span>
              </div>
              {request.notes && (
                <p className="text-sm text-gray-600 mt-2">{request.notes}</p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(request.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>

            {request.status === 'pending' && (
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleAccept(request.id, request.client_name)}
                  className="flex-1 bg-teal-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-600 transition flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Aceitar
                </button>
                <button
                  onClick={() => handleReject(request.id)}
                  className="flex-1 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-100 transition flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Recusar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {requests.length === 0 && (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Nenhum chamado no momento</p>
        </div>
      )}
    </div>
  );
}
