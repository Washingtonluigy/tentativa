import { useState } from 'react';
import { Star, X, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RatingModalProps {
  serviceRequestId: string;
  professionalId: string;
  clientId: string;
  professionalName: string;
  onClose: () => void;
  onSubmitted: () => void;
}

const FEEDBACK_TAGS = [
  'Otimo atendimento',
  'Muito bom',
  'Profissional dedicado',
  'Me ajudou rapido',
  'Atencioso',
  'Pontual',
  'Explicou bem',
  'Recomendo',
  'Demorou muito',
  'Nao me ajudou',
  'Pode melhorar',
  'Falta de atencao',
];

export default function RatingModal({
  serviceRequestId,
  professionalId,
  clientId,
  professionalName,
  onClose,
  onSubmitted,
}: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);

    try {
      await supabase.from('professional_ratings').insert({
        professional_id: professionalId,
        client_id: clientId,
        service_request_id: serviceRequestId,
        rating,
      });

      if (selectedTags.length > 0) {
        const feedbackRows = selectedTags.map(tag => ({
          professional_id: professionalId,
          client_id: clientId,
          service_request_id: serviceRequestId,
          tag,
        }));
        await supabase.from('professional_feedback').insert(feedbackRows);
      }

      const { data: profData } = await supabase
        .from('professionals')
        .select('rating_count')
        .eq('user_id', professionalId)
        .maybeSingle();

      const newCount = (profData?.rating_count || 0) + 1;
      const newRating = Math.min(5.0, 4.0 + Math.floor(newCount / 5) * 0.1);

      await supabase
        .from('professionals')
        .update({ rating_count: newCount, rating: newRating })
        .eq('user_id', professionalId);

      onSubmitted();
    } catch (error) {
      console.error('Error submitting rating:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Avaliar Profissional</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <div className="text-center mb-6">
            <p className="text-gray-600 mb-4">
              Como foi o atendimento com <span className="font-semibold">{professionalName}</span>?
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= (hoveredStar || rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                {rating === 1 && 'Ruim'}
                {rating === 2 && 'Regular'}
                {rating === 3 && 'Bom'}
                {rating === 4 && 'Muito Bom'}
                {rating === 5 && 'Excelente'}
              </p>
            )}
          </div>

          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Deixe um elogio ou observacao (opcional):
            </p>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedTags.includes(tag)
                      ? 'bg-teal-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className="w-full bg-teal-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-teal-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              {submitting ? 'Enviando...' : 'Enviar Avaliacao'}
            </button>
            <button
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Pular
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
