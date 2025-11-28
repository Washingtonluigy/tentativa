import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Video, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationPopup } from '../../components/NotificationPopup';

interface RequestServiceProps {
  professionalId: string;
  professionalName: string;
  onBack: () => void;
  onSuccess: () => void;
}

interface ProfessionalService {
  id: string;
  name: string;
  description: string;
  price_message: number | null;
  price_video: number | null;
  price_local: number | null;
}

export function RequestService({ professionalId, professionalName, onBack, onSuccess }: RequestServiceProps) {
  const { user } = useAuth();
  const [serviceType, setServiceType] = useState<'message' | 'video_call' | 'in_person' | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<ProfessionalService[]>([]);
  const [selectedService, setSelectedService] = useState<ProfessionalService | null>(null);
  const [loadingServices, setLoadingServices] = useState(true);
  const [actualProfessionalId, setActualProfessionalId] = useState<string>('');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  useEffect(() => {
    loadProfessionalServices();
  }, [professionalId]);

  const loadProfessionalServices = async () => {
    setLoadingServices(true);
    try {
      // Buscar o professional_id a partir do user_id
      const { data: professionalData } = await supabase
        .from('professionals')
        .select('id')
        .eq('user_id', professionalId)
        .maybeSingle();

      if (!professionalData) {
        console.error('Professional not found for user_id:', professionalId);
        setLoadingServices(false);
        return;
      }

      console.log('Professional found:', professionalData);
      setActualProfessionalId(professionalData.id);

      // Buscar serviços do profissional
      const { data: servicesData, error } = await supabase
        .from('professional_services')
        .select('id, name, description, price_message, price_video, price_local')
        .eq('professional_id', professionalData.id)
        .eq('is_active', true);

      if (error) {
        console.error('Error loading services:', error);
      } else if (servicesData && servicesData.length > 0) {
        setServices(servicesData);
        // Selecionar o primeiro serviço por padrão
        setSelectedService(servicesData[0]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingServices(false);
    }
  };

  const getServiceOptions = () => {
    if (!selectedService) return [];

    const options = [];

    if (selectedService.price_message) {
      options.push({
        type: 'message' as const,
        icon: MessageSquare,
        title: 'Atendimento por Mensagem',
        description: 'Converse por texto com o profissional',
        price: `R$ ${selectedService.price_message.toFixed(2)}`,
      });
    }

    if (selectedService.price_video) {
      options.push({
        type: 'video_call' as const,
        icon: Video,
        title: 'Atendimento por Vídeo',
        description: 'Chamada de vídeo em tempo real',
        price: `R$ ${selectedService.price_video.toFixed(2)}`,
      });
    }

    if (selectedService.price_local) {
      options.push({
        type: 'in_person' as const,
        icon: MapPin,
        title: 'Atendimento Domiciliar',
        description: 'O profissional vai até você - GPS ativado',
        price: `R$ ${selectedService.price_local.toFixed(2)}`,
      });
    }

    return options;
  };

  const serviceOptions = getServiceOptions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!serviceType || !user) {
      console.error('Missing required data:', { serviceType, user: !!user });
      alert('Por favor, selecione um tipo de atendimento.');
      return;
    }

    if (!selectedService) {
      console.error('No service selected');
      alert('Erro ao identificar o serviço. Por favor, tente novamente.');
      return;
    }

    setLoading(true);

    try {
      const isHomeService = serviceType === 'in_person';

      if (!actualProfessionalId) {
        console.error('Professional ID not loaded');
        alert('Erro ao identificar o profissional. Por favor, tente novamente.');
        setLoading(false);
        return;
      }

      console.log('Sending service request:', {
        client_id: user.id,
        professional_id: professionalId,
        professional_service_id: selectedService.id,
        service_type: serviceType,
        status: 'pending',
      });

      const { data: requestData, error: requestError } = await supabase
        .from('service_requests')
        .insert([{
          client_id: user.id,
          professional_id: professionalId,
          professional_service_id: selectedService.id,
          service_type: serviceType,
          notes: notes,
          status: 'pending',
        }])
        .select()
        .single();

      if (requestError) {
        console.error('Error creating service request:', requestError);
        alert(`Erro ao criar solicitação: ${requestError.message}`);
        setLoading(false);
        return;
      }

      console.log('Service request created:', requestData);

      // Criar ou atualizar conversa
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', user.id)
        .eq('professional_id', professionalId)
        .maybeSingle();

      if (!existingConv) {
        const { error: convError } = await supabase
          .from('conversations')
          .insert({
            client_id: user.id,
            professional_id: professionalId,
            request_id: requestData.id,
          });

        if (convError) {
          console.error('Error creating conversation:', convError);
        }
      }

      // Capturar localização se for atendimento presencial
      if (isHomeService && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { error: locationError } = await supabase
              .from('service_locations')
              .insert({
                service_request_id: requestData.id,
                user_id: user.id,
                user_type: 'client',
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date().toISOString(),
                is_active: true,
              });

            if (locationError) {
              console.error('Error saving location:', locationError);
            }
          },
          (error) => {
            console.error('Error getting location:', error);
          }
        );
      }

      setLoading(false);
      setNotificationMessage('Solicitação enviada com sucesso!');
      setShowNotification(true);
      setTimeout(() => {
        onSuccess();
      }, 3000);
    } catch (err) {
      console.error('Unexpected error:', err);
      setNotificationMessage('Erro inesperado ao enviar solicitação. Tente novamente.');
      setShowNotification(true);
      setLoading(false);
    }
  };

  if (loadingServices) {
    return (
      <div className="p-4 pb-20 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="p-4 pb-20">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Abrir Chamado</h2>
        </div>
        <div className="text-center py-12">
          <p className="text-gray-600">Este profissional ainda não cadastrou serviços.</p>
          <button
            onClick={onBack}
            className="mt-4 px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Abrir Chamado</h2>
          <p className="text-sm text-gray-600">{professionalName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {services.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Escolha o serviço
            </label>
            <div className="space-y-2">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    setSelectedService(service);
                    setServiceType(null);
                  }}
                  className={`w-full bg-white rounded-lg shadow-sm p-4 border-2 transition text-left ${
                    selectedService?.id === service.id
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="font-semibold text-gray-800">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Escolha o tipo de atendimento
          </label>
          {serviceOptions.length === 0 ? (
            <p className="text-gray-600 text-sm">Nenhuma modalidade disponível para este serviço.</p>
          ) : (
            <div className="space-y-3">
              {serviceOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = serviceType === option.type;

              return (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => setServiceType(option.type)}
                  className={`w-full bg-white rounded-xl shadow-sm p-4 border-2 transition text-left ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-lg ${isSelected ? 'bg-teal-500' : 'bg-gray-100'}`}>
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{option.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                      <p className="text-lg font-bold text-teal-600 mt-2">{option.price}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            rows={4}
            placeholder="Descreva sua necessidade ou dúvida..."
          />
        </div>

        <button
          type="submit"
          disabled={!serviceType || loading || serviceOptions.length === 0}
          className="w-full bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Enviando...' : 'Enviar Solicitação'}
        </button>
      </form>

      <NotificationPopup
        isOpen={showNotification}
        message={notificationMessage}
        onClose={() => setShowNotification(false)}
      />
    </div>
  );
}
