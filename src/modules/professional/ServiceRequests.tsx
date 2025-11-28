import React, { useState, useEffect } from 'react';
import { Clock, Check, X, User, MapPin, Phone, Video, MessageSquare, Mail, CheckCircle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ServiceRequest {
  id: string;
  client_id: string;
  client_name: string;
  client_phone: string;
  client_city: string;
  service_type: string;
  status: string;
  notes: string;
  created_at: string;
  professional_service_id: string | null;
}

interface ClientDetails {
  full_name: string;
  phone: string;
  city: string;
  address: string;
  cpf: string;
  birth_date: string;
  created_at: string;
}

interface ServiceRequestsProps {
  onRequestUpdate?: () => void;
  onNavigateToConversations?: () => void;
}

export function ServiceRequests({ onRequestUpdate, onNavigateToConversations }: ServiceRequestsProps = {}) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [selectedClient, setSelectedClient] = useState<{ requestId: string; clientId: string } | null>(null);
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('service_requests')
      .select(`
        id,
        client_id,
        service_type,
        status,
        notes,
        created_at,
        professional_service_id
      `)
      .eq('professional_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading requests:', error);
      return;
    }

    if (data) {
      // Buscar perfis dos clientes separadamente
      const clientIds = [...new Set(data.map(r => r.client_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, city')
        .in('user_id', clientIds);

      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, p]) || []
      );

      const formatted = data.map((r: any) => {
        const profile = profilesMap.get(r.client_id);
        return {
          id: r.id,
          client_id: r.client_id,
          client_name: profile?.full_name || 'Cliente',
          client_phone: profile?.phone || 'N/A',
          client_city: profile?.city || 'N/A',
          service_type: r.service_type,
          status: r.status,
          notes: r.notes,
          created_at: r.created_at,
          professional_service_id: r.professional_service_id,
        };
      });
      setRequests(formatted);
    }
  };

  const handleAccept = async (requestId: string, clientId: string, professionalServiceId: string | null) => {
    try {
      let paymentLink = null;

      // Buscar a solicitação para pegar o tipo de serviço
      const { data: requestData } = await supabase
        .from('service_requests')
        .select('service_type')
        .eq('id', requestId)
        .maybeSingle();

      // Buscar o link de pagamento do serviço profissional baseado no tipo
      if (professionalServiceId && requestData) {
        const { data: serviceData } = await supabase
          .from('professional_services')
          .select('payment_link_message, payment_link_video, payment_link_local')
          .eq('id', professionalServiceId)
          .maybeSingle();

        if (serviceData) {
          // Selecionar o link correto baseado no tipo de serviço
          switch (requestData.service_type) {
            case 'message':
              paymentLink = serviceData.payment_link_message;
              break;
            case 'video_call':
              paymentLink = serviceData.payment_link_video;
              break;
            case 'in_person':
              paymentLink = serviceData.payment_link_local;
              break;
          }
        }
      }

      // Atualizar o status e adicionar o link de pagamento
      await supabase
        .from('service_requests')
        .update({
          status: 'accepted',
          payment_link: paymentLink
        })
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
      onRequestUpdate?.();
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Erro ao aceitar chamado');
    }
  };

  const handleReject = async (requestId: string) => {
    if (confirm('Deseja realmente recusar este chamado?')) {
      await supabase
        .from('service_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      loadRequests();
      onRequestUpdate?.();
    }
  };

  const handleClientClick = async (clientId: string, requestId: string) => {
    setSelectedClient({ requestId, clientId });

    const { data } = await supabase
      .from('profiles')
      .select('full_name, phone, city, address, cpf, birth_date, created_at')
      .eq('user_id', clientId)
      .maybeSingle();

    if (data) {
      setClientDetails(data);
      setShowClientModal(true);
    }
  };

  const handleSendMessage = () => {
    setShowClientModal(false);
    onNavigateToConversations?.();
  };

  const handleCompleteService = async () => {
    if (!selectedClient) return;

    if (confirm('Deseja realmente finalizar este atendimento?')) {
      await supabase
        .from('service_requests')
        .update({ status: 'completed' })
        .eq('id', selectedClient.requestId);

      setShowClientModal(false);
      loadRequests();
      onRequestUpdate?.();
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
              <div
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition"
                onClick={() => request.status === 'accepted' && handleClientClick(request.client_id, request.id)}
              >
                <div className="bg-blue-100 p-3 rounded-full">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    {request.client_name}
                    {request.status === 'accepted' && (
                      <Info className="w-4 h-4 text-blue-500" />
                    )}
                  </h3>
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
                  onClick={() => handleAccept(request.id, request.client_id, request.professional_service_id)}
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

      {showClientModal && clientDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Informações do Cliente</h3>
                <button
                  onClick={() => setShowClientModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nome Completo</p>
                    <p className="font-semibold text-gray-800">{clientDetails.full_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-3 rounded-full">
                    <Phone className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Telefone</p>
                    <p className="font-semibold text-gray-800">{clientDetails.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <MapPin className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Cidade</p>
                    <p className="font-semibold text-gray-800">{clientDetails.city}</p>
                  </div>
                </div>

                {clientDetails.address && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500 mb-1">Endereço</p>
                    <p className="text-gray-800">{clientDetails.address}</p>
                  </div>
                )}

                {clientDetails.cpf && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500 mb-1">CPF</p>
                    <p className="text-gray-800">{clientDetails.cpf}</p>
                  </div>
                )}

                {clientDetails.birth_date && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500 mb-1">Data de Nascimento</p>
                    <p className="text-gray-800">
                      {new Date(clientDetails.birth_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-500 mb-1">Cliente desde</p>
                  <p className="text-gray-800">
                    {new Date(clientDetails.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSendMessage}
                  className="w-full bg-teal-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-teal-600 transition flex items-center justify-center gap-2"
                >
                  <Mail className="w-5 h-5" />
                  Mandar Mensagem
                </button>
                <button
                  onClick={handleCompleteService}
                  className="w-full bg-green-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-600 transition flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Finalizar Atendimento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
