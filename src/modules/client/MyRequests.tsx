import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Request {
  id: string;
  professional_name: string;
  service_type: string;
  status: string;
  created_at: string;
  notes: string;
}

export function MyRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);

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
        created_at,
        notes,
        users!service_requests_professional_id_fkey(
          profiles(full_name)
        )
      `)
      .eq('client_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      const formatted = data.map((r: any) => ({
        id: r.id,
        professional_name: r.users?.profiles?.full_name || 'Profissional',
        service_type: r.service_type,
        status: r.status,
        created_at: r.created_at,
        notes: r.notes,
      }));
      setRequests(formatted);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'accepted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Aguardando resposta';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-50 border-orange-200';
      case 'accepted':
        return 'bg-green-50 border-green-200';
      case 'rejected':
        return 'bg-red-50 border-red-200';
      case 'completed':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'message':
        return 'Mensagem';
      case 'video_call':
        return 'Vídeo';
      case 'in_person':
        return 'Presencial';
      default:
        return type;
    }
  };

  return (
    <div className="p-4 pb-20">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Meus Chamados</h2>

      <div className="space-y-4">
        {requests.map((request) => (
          <div
            key={request.id}
            className={`rounded-xl shadow-sm p-4 border-2 ${getStatusColor(request.status)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-800">{request.professional_name}</h3>
                <p className="text-sm text-gray-600 capitalize">{getServiceTypeLabel(request.service_type)}</p>
              </div>
              {getStatusIcon(request.status)}
            </div>

            {request.notes && (
              <p className="text-sm text-gray-600 mb-3 bg-white rounded-lg p-2">
                {request.notes}
              </p>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {new Date(request.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {getStatusLabel(request.status)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {requests.length === 0 && (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Nenhum chamado realizado</p>
        </div>
      )}
    </div>
  );
}
