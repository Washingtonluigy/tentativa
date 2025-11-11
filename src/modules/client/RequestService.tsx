import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, Video, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface RequestServiceProps {
  professionalId: string;
  professionalName: string;
  onBack: () => void;
  onSuccess: () => void;
}

export function RequestService({ professionalId, professionalName, onBack, onSuccess }: RequestServiceProps) {
  const { user } = useAuth();
  const [serviceType, setServiceType] = useState<'message' | 'video_call' | 'in_person' | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const serviceOptions = [
    {
      type: 'message' as const,
      icon: MessageSquare,
      title: 'Atendimento por Mensagem',
      description: 'Converse por texto com o profissional',
      price: 'R$ 50,00',
    },
    {
      type: 'video_call' as const,
      icon: Video,
      title: 'Atendimento por Vídeo',
      description: 'Chamada de vídeo em tempo real',
      price: 'R$ 100,00',
    },
    {
      type: 'in_person' as const,
      icon: MapPin,
      title: 'Atendimento Presencial',
      description: 'O profissional vai até você',
      price: 'R$ 150,00',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!serviceType || !user) return;

    setLoading(true);

    const { data: requestData, error: requestError } = await supabase
      .from('service_requests')
      .insert([{
        client_id: user.id,
        professional_id: professionalId,
        service_type: serviceType,
        notes: notes,
        status: 'pending',
      }])
      .select()
      .single();

    if (!requestError && requestData) {
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', user.id)
        .eq('professional_id', professionalId)
        .maybeSingle();

      if (!existingConv) {
        await supabase
          .from('conversations')
          .insert({
            client_id: user.id,
            professional_id: professionalId,
            request_id: requestData.id,
          });
      }
    }

    setLoading(false);

    if (!requestError) {
      onSuccess();
    }
  };

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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Escolha o tipo de atendimento
          </label>
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
          disabled={!serviceType || loading}
          className="w-full bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Enviando...' : 'Enviar Solicitação'}
        </button>
      </form>
    </div>
  );
}
