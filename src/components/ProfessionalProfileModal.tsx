import { useState, useEffect } from 'react';
import { X, Star, User, Briefcase, Award, MapPin, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProfessionalProfileModalProps {
  professionalUserId: string;
  onClose: () => void;
  onRequestService?: (professionalId: string, professionalName: string) => void;
}

interface FeedbackItem {
  tag: string;
  count: number;
}

export default function ProfessionalProfileModal({
  professionalUserId,
  onClose,
  onRequestService,
}: ProfessionalProfileModalProps) {
  const [profName, setProfName] = useState('');
  const [profPhoto, setProfPhoto] = useState('');
  const [profCategory, setProfCategory] = useState('');
  const [profDescription, setProfDescription] = useState('');
  const [profExperience, setProfExperience] = useState(0);
  const [profCity, setProfCity] = useState('');
  const [rating, setRating] = useState(4.0);
  const [ratingCount, setRatingCount] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, photo_url, city')
      .eq('user_id', professionalUserId)
      .maybeSingle();

    if (profileData) {
      setProfName(profileData.full_name || 'Profissional');
      setProfPhoto(profileData.photo_url || '');
      setProfCity(profileData.city || '');
    }

    const { data: profData } = await supabase
      .from('professionals')
      .select('description, experience_years, category_id, rating, rating_count')
      .eq('user_id', professionalUserId)
      .maybeSingle();

    if (profData) {
      setProfDescription(profData.description || '');
      setProfExperience(profData.experience_years || 0);
      setRating(profData.rating || 4.0);
      setRatingCount(profData.rating_count || 0);

      if (profData.category_id) {
        const { data: catData } = await supabase
          .from('categories')
          .select('name')
          .eq('id', profData.category_id)
          .maybeSingle();
        if (catData) setProfCategory(catData.name || '');
      }
    }

    const { data: feedbackData } = await supabase
      .from('professional_feedback')
      .select('tag')
      .eq('professional_id', professionalUserId);

    if (feedbackData && feedbackData.length > 0) {
      const tagCounts: Record<string, number> = {};
      feedbackData.forEach((f: any) => {
        tagCounts[f.tag] = (tagCounts[f.tag] || 0) + 1;
      });
      const sorted = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
      setFeedback(sorted);
    }

    setLoading(false);
  };

  const displayRating = Math.min(5.0, rating || 4.0).toFixed(1);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <p className="text-gray-600">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Perfil do Profissional</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <div className="text-center mb-6">
            {profPhoto ? (
              <img
                src={profPhoto}
                alt={profName}
                className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-4 border-teal-100"
              />
            ) : (
              <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="w-10 h-10 text-teal-600" />
              </div>
            )}
            <h4 className="text-lg font-bold text-gray-900">{profName}</h4>
            {profCategory && <p className="text-sm text-teal-600 font-medium">{profCategory}</p>}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(rating || 4)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-lg font-bold text-gray-800">{displayRating}</span>
              <span className="text-sm text-gray-500">({ratingCount} avaliacoes)</span>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {profCity && (
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <MapPin className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Cidade</p>
                  <p className="text-sm font-semibold text-gray-800">{profCity}</p>
                </div>
              </div>
            )}

            {profExperience > 0 && (
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <Award className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Experiencia</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {profExperience} {profExperience === 1 ? 'ano' : 'anos'}
                  </p>
                </div>
              </div>
            )}

            {profDescription && (
              <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                <Briefcase className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Sobre</p>
                  <p className="text-sm text-gray-800">{profDescription}</p>
                </div>
              </div>
            )}
          </div>

          {feedback.length > 0 && (
            <div className="mb-4">
              <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Avaliacoes dos Clientes
              </h5>
              <div className="flex flex-wrap gap-2">
                {feedback.map(f => (
                  <div
                    key={f.tag}
                    className="bg-teal-50 border border-teal-200 text-teal-700 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1"
                  >
                    {f.tag}
                    <span className="bg-teal-200 text-teal-800 text-xs px-1.5 py-0.5 rounded-full ml-1">
                      {f.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 pt-2">
            {onRequestService && (
              <button
                onClick={() => onRequestService(professionalUserId, profName)}
                className="w-full bg-teal-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-teal-600 transition-all shadow-md"
              >
                Abrir Chamado
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
