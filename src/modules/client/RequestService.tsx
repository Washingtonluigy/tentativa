import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Video, MapPin, ChevronDown, ChevronUp, Clock, AlertCircle, Calendar } from 'lucide-react';
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

interface AvailableSlot {
  day: string;
  dayOfWeek: number;
  date: string;
  slots: { start_time: string; end_time: string }[];
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
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [showAvailabilityInfo, setShowAvailabilityInfo] = useState(false);

  useEffect(() => {
    loadProfessionalServices();
  }, [professionalId]);

  useEffect(() => {
    if (actualProfessionalId) {
      checkProfessionalAvailability();
    }
  }, [actualProfessionalId]);

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

  const checkProfessionalAvailability = async () => {
    try {
      const today = new Date();
      const todayDayOfWeek = today.getDay();
      const currentTime = today.toTimeString().slice(0, 5);

      // Verificar se profissional está em atendimento
      const { data: appointments } = await supabase
        .from('scheduled_appointments')
        .select('*')
        .eq('professional_id', actualProfessionalId)
        .eq('status', 'in_progress')
        .maybeSingle();

      if (appointments) {
        setIsAvailable(false);
        await loadNextAvailableSlots();
        return;
      }

      // Verificar horários configurados do profissional
      const { data: availabilityData } = await supabase
        .from('professional_availability')
        .select('*')
        .eq('professional_id', actualProfessionalId)
        .eq('is_active', true)
        .eq('day_of_week', todayDayOfWeek);

      // Se não tem horário configurado para hoje, está indisponível
      if (!availabilityData || availabilityData.length === 0) {
        setIsAvailable(false);
        await loadNextAvailableSlots();
        return;
      }

      // Verificar se está dentro de algum dos horários de hoje
      const isWithinSchedule = availabilityData.some((slot: any) => {
        const startTime = slot.start_time.slice(0, 5);
        const endTime = slot.end_time.slice(0, 5);
        return currentTime >= startTime && currentTime <= endTime;
      });

      if (isWithinSchedule) {
        setIsAvailable(true);
      } else {
        setIsAvailable(false);
        await loadNextAvailableSlots();
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      setIsAvailable(true);
    }
  };

  const loadNextAvailableSlots = async () => {
    try {
      const { data: availabilityData } = await supabase
        .from('professional_availability')
        .select('*')
        .eq('professional_id', actualProfessionalId)
        .eq('is_active', true)
        .order('day_of_week');

      if (!availabilityData || availabilityData.length === 0) {
        setAvailableSlots([]);
        return;
      }

      const today = new Date();
      const todayDayOfWeek = today.getDay();
      const slots: AvailableSlot[] = [];
      const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

      // Agrupar por dia da semana
      const slotsByDay = new Map<number, { start_time: string; end_time: string }[]>();
      availabilityData.forEach((slot: any) => {
        if (!slotsByDay.has(slot.day_of_week)) {
          slotsByDay.set(slot.day_of_week, []);
        }
        slotsByDay.get(slot.day_of_week)!.push({
          start_time: slot.start_time,
          end_time: slot.end_time
        });
      });

      // Buscar próximos 7 dias com disponibilidade
      for (let i = 1; i <= 14; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + i);
        const futureDayOfWeek = futureDate.getDay();

        if (slotsByDay.has(futureDayOfWeek)) {
          slots.push({
            day: daysOfWeek[futureDayOfWeek],
            dayOfWeek: futureDayOfWeek,
            date: futureDate.toLocaleDateString('pt-BR'),
            slots: slotsByDay.get(futureDayOfWeek)!
          });

          if (slots.length >= 5) break;
        }
      }

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading next available slots:', error);
      setAvailableSlots([]);
    }
  };

  const toggleDescription = (serviceId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  const renderServiceDescription = (serviceId: string, description: string) => {
    if (!description) return null;

    const isExpanded = expandedDescriptions.has(serviceId);
    const shouldShowButton = description.length > 150;

    return (
      <div className="mt-1">
        <p className={`text-sm text-gray-600 ${!isExpanded && shouldShowButton ? 'line-clamp-3' : ''}`}>
          {description}
        </p>
        {shouldShowButton && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleDescription(serviceId);
            }}
            className="text-teal-600 text-xs font-medium mt-1 flex items-center gap-1 hover:text-teal-700 transition"
          >
            {isExpanded ? (
              <>
                Ver menos <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                Ver mais <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        )}
      </div>
    );
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

      {!isAvailable && availableSlots.length > 0 && (
        <div className="mb-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-1">Profissional Indisponível no Momento</h3>
              <p className="text-sm text-yellow-800 mb-3">
                Este profissional não está disponível agora, mas você pode solicitar agendamento para os seguintes horários:
              </p>
              <button
                type="button"
                onClick={() => setShowAvailabilityInfo(!showAvailabilityInfo)}
                className="text-sm font-medium text-yellow-900 hover:text-yellow-700 flex items-center gap-1"
              >
                <Calendar className="w-4 h-4" />
                {showAvailabilityInfo ? 'Ocultar horários' : 'Ver horários disponíveis'}
              </button>
            </div>
          </div>

          {showAvailabilityInfo && (
            <div className="mt-3 space-y-2 border-t border-yellow-200 pt-3">
              {availableSlots.map((slot, index) => (
                <div key={index} className="bg-white rounded-lg p-3 border border-yellow-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-teal-600" />
                      <span className="font-semibold text-gray-900">{slot.day}</span>
                    </div>
                    <span className="text-sm text-gray-600">{slot.date}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {slot.slots.map((timeSlot, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                        <Clock className="w-3 h-3 text-teal-600" />
                        <span className="text-sm text-teal-900 font-medium">
                          {timeSlot.start_time.slice(0, 5)} - {timeSlot.end_time.slice(0, 5)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Dica:</strong> Você ainda pode solicitar o atendimento. O profissional receberá sua solicitação e poderá aceitar para um dos horários disponíveis.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

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
                  {renderServiceDescription(service.id, service.description)}
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
