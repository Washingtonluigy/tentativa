import React, { useState, useEffect } from 'react';
import { Clock, Check, X, User, MapPin, Phone, Video, MessageSquare, Mail, CheckCircle, Info, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { VideoCallRoom } from '../../components/VideoCallRoom';

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
  video_call_room_id?: string | null;
  video_call_status?: string | null;
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
  const [activeTab, setActiveTab] = useState<'pending' | 'in_progress' | 'completed'>('pending');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [videoCallRoom, setVideoCallRoom] = useState<{ roomId: string; userName: string } | null>(null);

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
      if (!user) return;

      const { data: requestData } = await supabase
        .from('service_requests')
        .select('service_type')
        .eq('id', requestId)
        .maybeSingle();

      if (!requestData) {
        alert('Erro ao buscar dados do chamado');
        return;
      }

      const { data: professional } = await supabase
        .from('professionals')
        .select('id, mercadopago_connected')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!professional) {
        alert('Erro ao buscar dados do profissional');
        return;
      }

      await supabase
        .from('service_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (professional.mercadopago_connected) {
        let amount = 1.00;

        if (professionalServiceId) {
          const { data: serviceData } = await supabase
            .from('professional_services')
            .select('minimum_price')
            .eq('id', professionalServiceId)
            .maybeSingle();

          if (serviceData?.minimum_price) {
            amount = serviceData.minimum_price;
          }
        }

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-create-payment`;

        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              serviceRequestId: requestId,
              amount: amount,
              commissionPercentage: 10
            }),
          });

          const paymentData = await response.json();

          if (paymentData.success && paymentData.initPoint) {
            await supabase
              .from('service_requests')
              .update({ payment_link: paymentData.initPoint })
              .eq('id', requestId);
          } else if (paymentData.needsConnection) {
            alert('Você precisa conectar sua conta Mercado Pago primeiro. Acesse a aba "Pagamentos".');
          } else if (paymentData.needsRefresh) {
            alert('Seu token expirou. Renove-o na aba "Pagamentos".');
          }
        } catch (paymentError) {
          console.error('Error creating payment:', paymentError);
        }
      }

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
      alert('Chamado aceito com sucesso!');
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Erro ao aceitar chamado');
    }
  };

  const handleReject = async (requestId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Recusar Chamado',
      message: 'Deseja realmente recusar este chamado?',
      onConfirm: async () => {
        await supabase
          .from('service_requests')
          .update({ status: 'rejected' })
          .eq('id', requestId);

        setConfirmModal({ ...confirmModal, isOpen: false });
        loadRequests();
        onRequestUpdate?.();
      }
    });
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

    setConfirmModal({
      isOpen: true,
      title: 'Finalizar Atendimento',
      message: 'Deseja realmente finalizar este atendimento?',
      onConfirm: async () => {
        await supabase
          .from('service_requests')
          .update({ status: 'completed' })
          .eq('id', selectedClient.requestId);

        setConfirmModal({ ...confirmModal, isOpen: false });
        setShowClientModal(false);
        loadRequests();
        onRequestUpdate?.();
      }
    });
  };

  const handleStartVideoCall = async (request: ServiceRequest) => {
    if (!user) return;

    const roomId = `video-call-${request.id}-${Date.now()}`;

    await supabase
      .from('service_requests')
      .update({
        video_call_room_id: roomId,
        video_call_status: 'pending',
        video_call_started_at: new Date().toISOString(),
      })
      .eq('id', request.id);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    setVideoCallRoom({
      roomId,
      userName: profileData?.full_name || 'Profissional',
    });

    loadRequests();
  };

  const handleJoinVideoCall = async (request: ServiceRequest) => {
    if (!user || !request.video_call_room_id) return;

    await supabase
      .from('service_requests')
      .update({
        video_call_status: 'active',
      })
      .eq('id', request.id);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    setVideoCallRoom({
      roomId: request.video_call_room_id,
      userName: profileData?.full_name || 'Profissional',
    });

    loadRequests();
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
        return 'Atendimento Domiciliar';
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-700';
      case 'accepted':
        return 'bg-blue-100 text-blue-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'accepted':
        return 'Em Andamento';
      case 'rejected':
        return 'Recusado';
      case 'completed':
        return 'Finalizado';
      case 'cancelled':
        return 'Cancelado pelo Cliente';
      default:
        return status;
    }
  };

  const filteredRequests = requests.filter(request => {
    if (activeTab === 'pending') return request.status === 'pending';
    if (activeTab === 'in_progress') return request.status === 'accepted';
    if (activeTab === 'completed') return request.status === 'completed' || request.status === 'cancelled';
    return true;
  });

  return (
    <div className="p-4 pb-20">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Chamados</h2>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'pending'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Pendente ({requests.filter(r => r.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('in_progress')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'in_progress'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Em Andamento ({requests.filter(r => r.status === 'accepted').length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'completed'
              ? 'bg-red-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Finalizado ({requests.filter(r => r.status === 'completed').length})
        </button>
      </div>

      <div className="space-y-4">
        {filteredRequests.map((request) => (
          <div
            key={request.id}
            className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`flex items-center gap-3 rounded-lg p-2 -m-2 transition ${
                  request.status === 'accepted' ? 'cursor-pointer hover:bg-gray-50' : ''
                }`}
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
              {request.service_type === 'in_person' && request.status === 'accepted' && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    Use o GPS para ver a localização do cliente
                  </p>
                </div>
              )}
              {request.service_type === 'video_call' && request.status === 'accepted' && (
                <div className="mt-2">
                  {!request.video_call_room_id ? (
                    <button
                      onClick={() => handleStartVideoCall(request)}
                      className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-2 px-4 rounded-lg font-medium hover:from-green-600 hover:to-teal-600 transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <Camera className="w-5 h-5" />
                      Abrir Câmera
                    </button>
                  ) : request.video_call_status === 'pending' ? (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-700 font-medium mb-2 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Aguardando cliente entrar na chamada...
                      </p>
                      <button
                        onClick={() => handleJoinVideoCall(request)}
                        className="w-full bg-green-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                      >
                        <Video className="w-5 h-5" />
                        Entrar na Chamada
                      </button>
                    </div>
                  ) : request.video_call_status === 'active' ? (
                    <button
                      onClick={() => handleJoinVideoCall(request)}
                      className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Video className="w-5 h-5" />
                      Voltar para Chamada
                    </button>
                  ) : null}
                </div>
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

      {filteredRequests.length === 0 && (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">
            {activeTab === 'pending' && 'Nenhum chamado pendente'}
            {activeTab === 'in_progress' && 'Nenhum chamado em andamento'}
            {activeTab === 'completed' && 'Nenhum chamado finalizado'}
          </p>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        confirmText="Confirmar"
        cancelText="Cancelar"
        confirmColor={confirmModal.title.includes('Finalizar') ? 'bg-green-500 hover:bg-green-600' : 'bg-teal-500 hover:bg-teal-600'}
      />

      {showClientModal && clientDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
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

      {videoCallRoom && (
        <VideoCallRoom
          roomId={videoCallRoom.roomId}
          userName={videoCallRoom.userName}
          onClose={() => {
            setVideoCallRoom(null);
            loadRequests();
          }}
        />
      )}
    </div>
  );
}
