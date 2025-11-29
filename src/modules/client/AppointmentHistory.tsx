import React, { useState, useEffect } from 'react';
import { Star, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Appointment {
  id: string;
  professional_name: string;
  service_type: string;
  completed_at: string;
  notes: string;
  rating: number | null;
  review_comment: string | null;
}

export function AppointmentHistory() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [ratingModal, setRatingModal] = useState<{ appointmentId: string; professionalName: string } | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    loadAppointments();
  }, [user]);

  const loadAppointments = async () => {
    if (!user) return;

    const { data: completedRequests } = await supabase
      .from('service_requests')
      .select('*')
      .eq('client_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (completedRequests && completedRequests.length > 0) {
      const professionalIds = completedRequests.map((r: any) => r.professional_id);

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', professionalIds);

      const profilesMap = new Map(
        profilesData?.map((p: any) => [p.user_id, p.full_name]) || []
      );

      const formatted = completedRequests.map((r: any) => ({
        id: r.id,
        professional_name: profilesMap.get(r.professional_id) || 'Profissional',
        service_type: r.service_type,
        completed_at: r.updated_at || r.created_at,
        notes: r.notes || '',
        rating: r.rating || null,
        review_comment: r.review_comment || null,
      }));

      setAppointments(formatted);
    } else {
      setAppointments([]);
    }
  };

  const handleSubmitRating = async () => {
    if (!ratingModal || rating === 0) return;

    await supabase
      .from('service_requests')
      .update({
        rating,
        review_comment: comment,
      })
      .eq('id', ratingModal.appointmentId);

    setRatingModal(null);
    setRating(0);
    setComment('');
    loadAppointments();
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
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Histórico de Atendimentos</h2>

      <div className="space-y-4">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl shadow-sm p-4 border-2 border-blue-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 p-2 rounded-full">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{appointment.professional_name}</h3>
                  <p className="text-xs text-gray-600 capitalize">{getServiceTypeLabel(appointment.service_type)}</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-2">
              {new Date(appointment.completed_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>

            {appointment.notes && (
              <div className="bg-white rounded-lg p-3 mb-3">
                <p className="text-xs font-medium text-gray-700 mb-1">Observações:</p>
                <p className="text-sm text-gray-600">{appointment.notes}</p>
              </div>
            )}

            {appointment.rating ? (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= appointment.rating!
                          ? 'text-yellow-500 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                {appointment.review_comment && (
                  <p className="text-sm text-gray-600 mt-2">{appointment.review_comment}</p>
                )}
              </div>
            ) : (
              <button
                onClick={() =>
                  setRatingModal({
                    appointmentId: appointment.id,
                    professionalName: appointment.professional_name,
                  })
                }
                className="w-full bg-teal-50 text-teal-600 py-2 rounded-lg font-medium hover:bg-teal-100 transition flex items-center justify-center gap-2"
              >
                <Star className="w-5 h-5" />
                Avaliar Atendimento
              </button>
            )}
          </div>
        ))}
      </div>

      {appointments.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Nenhum atendimento concluído</p>
        </div>
      )}

      {ratingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Avaliar {ratingModal.professionalName}
            </h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Sua avaliação:</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? 'text-yellow-500 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comentário (opcional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                rows={3}
                placeholder="Conte como foi sua experiência..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRatingModal(null);
                  setRating(0);
                  setComment('');
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={rating === 0}
                className="flex-1 bg-teal-500 text-white py-2 rounded-lg font-medium hover:bg-teal-600 transition disabled:opacity-50"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
