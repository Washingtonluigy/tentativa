import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, MapPin, CreditCard, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ClientGPSTracking from './ClientGPSTracking';

interface Request {
  id: string;
  professional_name: string;
  service_type: string;
  status: string;
  created_at: string;
  notes: string;
  is_home_service: boolean;
  payment_link: string | null;
  payment_completed: boolean;
}

export function MyRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [trackingRequestId, setTrackingRequestId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingPaymentRequest, setPendingPaymentRequest] = useState<Request | null>(null);

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
            // Carregar a solicitação completa
            loadRequests();
            // Mostrar modal de pagamento
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
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('service_requests')
      .select(`
        id,
        service_type,
        status,
        created_at,
        notes,
        is_home_service,
        payment_link,
        payment_completed,
        professional_id,
        profiles!service_requests_professional_id_fkey(full_name)
      `)
      .eq('client_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading requests:', error);
      return;
    }

    if (data) {
      const formatted = data.map((r: any) => ({
        id: r.id,
        professional_name: r.profiles?.full_name || 'Profissional',
        service_type: r.service_type,
        status: r.status,
        created_at: r.created_at,
        notes: r.notes,
        is_home_service: r.is_home_service || false,
        payment_link: r.payment_link,
        payment_completed: r.payment_completed || false,
      }));
      setRequests(formatted);

      // Verificar se há alguma solicitação aceita com pagamento pendente
      const pendingPayment = formatted.find(
        (r: Request) => r.status === 'accepted' && r.payment_link && !r.payment_completed
      );

      if (pendingPayment && !showPaymentModal) {
        setPendingPaymentRequest(pendingPayment);
        setShowPaymentModal(true);
      }
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

  if (trackingRequestId) {
    return (
      <ClientGPSTracking
        serviceRequestId={trackingRequestId}
        onClose={() => setTrackingRequestId(null)}
      />
    );
  }

  return (
    <div className="p-3 sm:p-4 pb-20">
      <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Meus Chamados</h2>

      <div className="space-y-3 sm:space-y-4">
        {requests.map((request) => (
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

            {request.is_home_service && (request.status === 'accepted' || request.status === 'in_progress') && (
              <button
                onClick={() => setTrackingRequestId(request.id)}
                className="w-full mt-2 sm:mt-3 bg-teal-500 text-white py-2 px-3 sm:px-4 rounded-lg font-medium hover:bg-teal-600 transition flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <MapPin size={16} className="sm:w-[18px] sm:h-[18px]" />
                Rastrear Profissional
              </button>
            )}
          </div>
        ))}
      </div>

      {requests.length === 0 && (
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
                onClick={handleSkipPayment}
                className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Pagar Depois
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              Você será redirecionado para uma página segura de pagamento
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
