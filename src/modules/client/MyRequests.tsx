import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, MapPin, CreditCard, ExternalLink, MessageCircle, User, X, Phone, MapPinIcon, Briefcase, Award, Video, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ClientGPSTracking from './ClientGPSTracking';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { VideoCallRoom } from '../../components/VideoCallRoom';

interface Request {
  id: string;
  professional_id: string;
  professional_name: string;
  professional_phone: string;
  professional_city: string;
  professional_areas: string;
  professional_experience: number;
  service_type: string;
  status: string;
  created_at: string;
  notes: string;
  is_home_service: boolean;
  payment_link: string | null;
  payment_completed: boolean;
  video_call_room_id?: string | null;
  video_call_status?: string | null;
}

interface MyRequestsProps {
  onOpenChat: (professionalId: string) => void;
}

export function MyRequests({ onOpenChat }: MyRequestsProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [trackingRequestId, setTrackingRequestId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingPaymentRequest, setPendingPaymentRequest] = useState<Request | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [professionalDetails, setProfessionalDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [videoCallRoom, setVideoCallRoom] = useState<{ roomId: string; userName: string } | null>(null);
  const [showVideoCallNotification, setShowVideoCallNotification] = useState(false);
  const [pendingVideoCallRequest, setPendingVideoCallRequest] = useState<Request | null>(null);

  useEffect(() => {
    loadRequests();

    // Subscrever a mudanças nas solicitações para detectar aceitação
    const subscription = supabase
      .channel('service_requests_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_requests',
          filter: `client_id=eq.${user?.id}`
        },
        (payload: any) => {
          if (payload.new.status === 'accepted' && payload.new.payment_link && !payload.new.payment_completed) {
            loadRequests();
            const request = {
              id: payload.new.id,
              payment_link: payload.new.payment_link,
              payment_completed: payload.new.payment_completed,
              status: payload.new.status,
              service_type: payload.new.service_type,
              professional_name: 'Profissional',
              created_at: payload.new.created_at,
              notes: payload.new.notes || '',
              is_home_service: payload.new.is_home_service || false
            };
            setPendingPaymentRequest(request);
            setShowPaymentModal(true);
          }

          if (payload.new.video_call_room_id && payload.new.video_call_status === 'pending') {
            loadRequests();
            const updatedRequest = requests.find(r => r.id === payload.new.id);
            if (updatedRequest) {
              setPendingVideoCallRequest({
                ...updatedRequest,
                video_call_room_id: payload.new.video_call_room_id,
                video_call_status: payload.new.video_call_status
              });
              setShowVideoCallNotification(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;

    const { data: requestsData, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading requests:', error);
      return;
    }

    if (requestsData && requestsData.length > 0) {
      const professionalIds = requestsData.map((r: any) => r.professional_id);

      const { data: servicesData } = await supabase
        .from('professional_services')
        .select('user_id, areas_of_expertise, years_of_experience')
        .in('user_id', professionalIds);

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, city')
        .in('user_id', professionalIds);

      const servicesMap = new Map(
        servicesData?.map((s: any) => [s.user_id, { areas: s.areas_of_expertise, experience: s.years_of_experience }]) || []
      );

      const profilesMap = new Map(
        profilesData?.map((p: any) => [p.user_id, { name: p.full_name, phone: p.phone, city: p.city }]) || []
      );

      const formatted = requestsData.map((r: any) => {
        const profile = profilesMap.get(r.professional_id);
        const service = servicesMap.get(r.professional_id);

        return {
          id: r.id,
          professional_id: r.professional_id,
          professional_name: profile?.name || 'Profissional',
          professional_phone: profile?.phone || 'Não informado',
          professional_city: profile?.city || 'Não informado',
          professional_areas: service?.areas || 'Não informado',
          professional_experience: service?.experience || 0,
          service_type: r.service_type,
          status: r.status,
          created_at: r.created_at,
          notes: r.notes,
          is_home_service: r.is_home_service || false,
          payment_link: r.payment_link,
          payment_completed: r.payment_completed || false,
        };
      });

      setRequests(formatted);

      const pendingPayment = formatted.find(
        (r: Request) => r.status === 'accepted' && r.payment_link && !r.payment_completed
      );

      if (pendingPayment && !showPaymentModal) {
        setPendingPaymentRequest(pendingPayment);
        setShowPaymentModal(true);
      }
    } else {
      setRequests([]);
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
      case 'cancelled':
        return 'Cancelado';
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
      case 'cancelled':
        return 'bg-gray-50 border-gray-200';
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

  const handlePayment = (request: Request) => {
    if (request.payment_link) {
      // Abrir link de pagamento em nova aba
      window.open(request.payment_link, '_blank');
    }
  };

  const handlePaymentCompleted = async (requestId: string) => {
    try {
      await supabase
        .from('service_requests')
        .update({ payment_completed: true })
        .eq('id', requestId);

      setShowPaymentModal(false);
      setPendingPaymentRequest(null);
      loadRequests();
    } catch (error) {
      console.error('Error marking payment as completed:', error);
      alert('Erro ao confirmar pagamento');
    }
  };

  const handleSkipPayment = () => {
    setShowPaymentModal(false);
    setPendingPaymentRequest(null);
  };

  const handleCancelRequest = (requestId: string) => {
    setRequestToCancel(requestId);
    setShowCancelModal(true);
  };

  const confirmCancelRequest = async () => {
    if (!requestToCancel) return;

    if (!cancellationReason.trim()) {
      alert('Por favor, informe o motivo do cancelamento');
      return;
    }

    try {
      await supabase
        .from('service_requests')
        .update({
          status: 'cancelled',
          cancellation_reason: cancellationReason.trim()
        })
        .eq('id', requestToCancel);

      setShowCancelModal(false);
      setRequestToCancel(null);
      setCancellationReason('');
      loadRequests();
    } catch (error) {
      console.error('Error cancelling request:', error);
      alert('Erro ao cancelar chamado');
    }
  };

  const openChat = (professionalId: string) => {
    onOpenChat(professionalId);
  };

  const handleAcceptVideoCall = async () => {
    if (!pendingVideoCallRequest || !user) return;

    await supabase
      .from('service_requests')
      .update({
        video_call_status: 'active',
      })
      .eq('id', pendingVideoCallRequest.id);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    setVideoCallRoom({
      roomId: pendingVideoCallRequest.video_call_room_id!,
      userName: profileData?.full_name || 'Cliente',
    });

    setShowVideoCallNotification(false);
    setPendingVideoCallRequest(null);
    loadRequests();
  };

  const handleJoinVideoCall = async (request: Request) => {
    if (!user || !request.video_call_room_id) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    setVideoCallRoom({
      roomId: request.video_call_room_id,
      userName: profileData?.full_name || 'Cliente',
    });

    loadRequests();
  };

  if (trackingRequestId) {
    return (
      <ClientGPSTracking
        serviceRequestId={trackingRequestId}
        onClose={() => setTrackingRequestId(null)}
      />
    );
  }

  const activeRequests = requests.filter(r => r.status !== 'completed' && r.status !== 'cancelled');
  const completedRequests = requests.filter(r => r.status === 'completed');

  return (
    <div className="p-3 sm:p-4 pb-20">
      <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Meus Chamados</h2>

      <div className="space-y-3 sm:space-y-4">
        {activeRequests.map((request) => (
          <div
            key={request.id}
            className={`rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 border-2 ${getStatusColor(request.status)}`}
          >
            <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm sm:text-base text-gray-800 truncate">{request.professional_name}</h3>
                <p className="text-xs sm:text-sm text-gray-600 capitalize truncate">{getServiceTypeLabel(request.service_type)}</p>
              </div>
              <div className="flex-shrink-0">
                {getStatusIcon(request.status)}
              </div>
            </div>

            {request.notes && (
              <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 bg-white rounded-lg p-2 line-clamp-2">
                {request.notes}
              </p>
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-xs text-gray-500 truncate">
                {new Date(request.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                {getStatusLabel(request.status)}
              </span>
            </div>

            {request.status === 'accepted' && request.payment_link && !request.payment_completed && (
              <button
                onClick={() => handlePayment(request)}
                className="w-full mt-2 sm:mt-3 bg-blue-600 text-white py-2 px-3 sm:px-4 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <CreditCard size={16} className="sm:w-[18px] sm:h-[18px]" />
                Realizar Pagamento
              </button>
            )}

            {(request.status === 'pending' || request.status === 'accepted') && (
              <button
                onClick={() => handleCancelRequest(request.id)}
                className="w-full mt-2 sm:mt-3 bg-red-50 text-red-600 py-2 px-3 sm:px-4 rounded-lg font-medium hover:bg-red-100 transition flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm border border-red-200"
              >
                <X size={16} className="sm:w-[18px] sm:h-[18px]" />
                Cancelar Chamado
              </button>
            )}

            {request.status === 'accepted' && (
              <div className="flex gap-2 mt-2 sm:mt-3">
                <button
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowDetailsModal(true);
                  }}
                  className="flex-1 bg-blue-50 text-blue-600 py-2 px-3 rounded-lg font-medium hover:bg-blue-100 transition flex items-center justify-center gap-1 text-xs sm:text-sm border border-blue-200"
                >
                  <User size={16} />
                  Ver Profissional
                </button>
                <button
                  onClick={() => openChat(request.professional_id)}
                  className="flex-1 bg-green-50 text-green-600 py-2 px-3 rounded-lg font-medium hover:bg-green-100 transition flex items-center justify-center gap-1 text-xs sm:text-sm border border-green-200"
                >
                  <MessageCircle size={16} />
                  Mensagem
                </button>
              </div>
            )}

            {request.is_home_service && (request.status === 'accepted' || request.status === 'in_progress') && (
              <button
                onClick={() => setTrackingRequestId(request.id)}
                className="w-full mt-2 sm:mt-3 bg-teal-500 text-white py-2 px-3 sm:px-4 rounded-lg font-medium hover:bg-teal-600 transition flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <MapPin size={16} className="sm:w-[18px] sm:h-[18px]" />
                Rastrear Profissional
              </button>
            )}

            {request.service_type === 'video_call' && request.status === 'accepted' && request.video_call_room_id && (
              <button
                onClick={() => handleJoinVideoCall(request)}
                className="w-full mt-2 sm:mt-3 bg-blue-500 text-white py-2 px-3 sm:px-4 rounded-lg font-medium hover:bg-blue-600 transition flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm shadow-md"
              >
                <Video size={16} className="sm:w-[18px] sm:h-[18px]" />
                {request.video_call_status === 'active' ? 'Voltar para Chamada' : 'Entrar na Chamada'}
              </button>
            )}
          </div>
        ))}
      </div>

      {activeRequests.length === 0 && (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Nenhum chamado realizado</p>
        </div>
      )}

      {/* Modal de Pagamento */}
      {showPaymentModal && pendingPaymentRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-fadeIn">
            <div className="text-center mb-6">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Chamado Aceito!
              </h3>
              <p className="text-gray-600">
                O profissional aceitou seu chamado. Para continuar, realize o pagamento do serviço.
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <CreditCard className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="font-semibold text-gray-900">Pagamento Necessário</p>
                  <p className="text-sm text-gray-600">Clique no botão abaixo para pagar</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  handlePayment(pendingPaymentRequest);
                  // Após abrir o link, perguntar se pagou
                  setTimeout(() => {
                    if (confirm('Você concluiu o pagamento?')) {
                      handlePaymentCompleted(pendingPaymentRequest.id);
                    }
                  }, 2000);
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-5 h-5" />
                Abrir Página de Pagamento
              </button>

              <button
                onClick={() => {
                  handleCancelRequest(pendingPaymentRequest.id);
                  setShowPaymentModal(false);
                  setPendingPaymentRequest(null);
                }}
                className="w-full bg-red-50 text-red-600 py-3 px-6 rounded-xl font-semibold hover:bg-red-100 transition-colors border-2 border-red-200 flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Cancelar Chamado
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              Você será redirecionado para uma página segura de pagamento
            </p>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Profissional */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Detalhes do Profissional</h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedRequest(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-br from-blue-500 to-teal-500 w-14 h-14 rounded-full flex items-center justify-center shadow-lg">
                  <User className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="font-bold text-lg text-gray-900">{selectedRequest.professional_name}</p>
                  <p className="text-sm text-gray-600 capitalize">{getServiceTypeLabel(selectedRequest.service_type)}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-white rounded-lg p-3 flex items-start gap-3">
                  <Phone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Telefone</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedRequest.professional_phone}</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 flex items-start gap-3">
                  <MapPinIcon className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Cidade</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedRequest.professional_city}</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Áreas de Atuação</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedRequest.professional_areas}</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 flex items-start gap-3">
                  <Award className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Experiência</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedRequest.professional_experience > 0
                        ? `${selectedRequest.professional_experience} ${selectedRequest.professional_experience === 1 ? 'ano' : 'anos'}`
                        : 'Não informado'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  openChat(selectedRequest.professional_id);
                  setShowDetailsModal(false);
                }}
                className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Enviar Mensagem
              </button>

              {selectedRequest.is_home_service && (
                <button
                  onClick={() => {
                    setTrackingRequestId(selectedRequest.id);
                    setShowDetailsModal(false);
                  }}
                  className="w-full bg-teal-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-teal-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <MapPin className="w-5 h-5" />
                  Rastrear Localização
                </button>
              )}

              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedRequest(null);
                }}
                className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelamento com Motivo */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Cancelar Chamado</h3>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setRequestToCancel(null);
                  setCancellationReason('');
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            <div className="mb-4">
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800 mb-1">Atenção</p>
                    <p className="text-sm text-red-700">Esta ação não pode ser desfeita. Por favor, informe o motivo do cancelamento.</p>
                  </div>
                </div>
              </div>

              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Motivo do Cancelamento *
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Ex: Encontrei outro profissional, Resolvi de outra forma, Mudei de ideia..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {cancellationReason.length}/500 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={confirmCancelRequest}
                disabled={!cancellationReason.trim()}
                className="w-full bg-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-red-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
              >
                Confirmar Cancelamento
              </button>

              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setRequestToCancel(null);
                  setCancellationReason('');
                }}
                className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {showVideoCallNotification && pendingVideoCallRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-bounce">
            <div className="text-center mb-6">
              <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Chamada de Vídeo
              </h3>
              <p className="text-gray-600">
                {pendingVideoCallRequest.professional_name} está te chamando para uma videochamada
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleAcceptVideoCall}
                className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-4 px-6 rounded-xl font-bold hover:from-green-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <Video className="w-6 h-6" />
                Aceitar Chamada
              </button>

              <button
                onClick={() => {
                  setShowVideoCallNotification(false);
                  setPendingVideoCallRequest(null);
                }}
                className="w-full bg-red-500 text-white py-4 px-6 rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <X className="w-6 h-6" />
                Recusar
              </button>
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
