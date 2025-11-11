import React, { useState, useEffect } from 'react';
import { Star, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Appointment {
  id: string;
  professional_name: string;
  completed_at: string;
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

    const { data } = await supabase
      .from('appointments')
      .select(`
        id,
        completed_at,
        rating,
        review_comment,
        users!appointments_professional_id_fkey(
          profiles(full_name)
        )
      `)
      .eq('client_id', user.id)
      .order('completed_at', { ascending: false });

    if (data) {
      const formatted = data.map((a: any) => ({
        id: a.id,
        professional_name: a.users?.profiles?.full_name || 'Profissional',
        completed_at: a.completed_at,
        rating: a.rating,
        review_comment: a.review_comment,
      }));
      setAppointments(formatted);
    }
  };

  const handleSubmitRating = async () => {
    if (!ratingModal || rating === 0) return;

    await supabase
      .from('appointments')
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

  return (
    <div className="p-4 pb-20">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Histórico de Atendimentos</h2>

      <div className="space-y-4">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-800">{appointment.professional_name}</h3>
                <p className="text-sm text-gray-600">
                  {new Date(appointment.completed_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>

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
