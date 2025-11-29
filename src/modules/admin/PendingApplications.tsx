import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, Clock, Mail, Phone, MapPin, Briefcase, Calendar, User } from 'lucide-react';
import { NotificationPopup } from '../../components/NotificationPopup';

interface Application {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  profession: string;
  registration_number: string;
  experience_years: number;
  state: string;
  city: string;
  professional_references: string;
  photo_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function PendingApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
    try {
      let query = supabase
        .from('professional_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setApplications(data || []);
    } catch (err) {
      console.error('Erro ao carregar solicitações:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const application = applications.find(app => app.id === id);
      if (!application) return;

      if (status === 'approved') {
        const { data: regionalData } = await supabase
          .from('regional_minimum_prices')
          .select('id')
          .eq('state', application.state)
          .eq('city', application.city)
          .eq('active', true)
          .maybeSingle();

        let regionalPriceId = regionalData?.id;

        if (!regionalPriceId) {
          const { data: stateData } = await supabase
            .from('regional_minimum_prices')
            .select('id')
            .eq('state', application.state)
            .is('city', null)
            .eq('active', true)
            .maybeSingle();

          regionalPriceId = stateData?.id;
        }

        const password = Math.random().toString(36).slice(-8) + 'A1!';

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: application.email,
          password: password,
          options: {
            data: {
              full_name: application.full_name,
              role: 'professional'
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          await supabase
            .from('users')
            .update({
              city: application.city,
              state: application.state,
              regional_price_id: regionalPriceId
            })
            .eq('id', authData.user.id);

          await supabase
            .from('professionals')
            .insert([{
              user_id: authData.user.id,
              profession: application.profession,
              registration_number: application.registration_number,
              experience_years: application.experience_years,
              bio: application.professional_references,
              photo_url: application.photo_url,
              is_active: true
            }]);
        }
      }

      const { error } = await supabase
        .from('professional_applications')
        .update({
          status,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setNotificationMessage(status === 'approved' ? 'Profissional aprovado com sucesso!' : 'Solicitação rejeitada.');
      setShowNotification(true);
      fetchApplications();
      setSelectedApp(null);
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err);
      setNotificationMessage('Erro: ' + err.message);
      setShowNotification(true);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    const labels = {
      pending: 'Pendente',
      approved: 'Aprovado',
      rejected: 'Rejeitado'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Cadastros Aguardando</h2>

        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos ({applications.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
              filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
              filter === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Aprovados
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
              filter === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rejeitados
          </button>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 sm:p-8 text-center">
          <Clock className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <p className="text-sm sm:text-base text-gray-600">Nenhuma solicitação encontrada</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {applications.map((app) => (
            <div key={app.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-3 sm:p-6">
                <div className="flex gap-2 sm:gap-4 mb-3 sm:mb-4">
                  {app.photo_url ? (
                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={app.photo_url}
                        alt={app.full_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-xl font-bold text-gray-900 mb-1 truncate">{app.full_name}</h3>
                        <div className="flex items-center gap-1 sm:gap-2 text-gray-600 text-xs sm:text-sm flex-wrap">
                          <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">{app.profession}</span>
                          <span className="text-gray-400 hidden sm:inline">•</span>
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">{app.experience_years} anos</span>
                        </div>
                        <div className="text-xs sm:text-sm text-blue-600 font-medium mt-1">
                          Registro: {app.registration_number}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(app.status)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 text-xs sm:text-sm min-w-0">
                    <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <a href={`mailto:${app.email}`} className="hover:text-blue-600 truncate">{app.email}</a>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 text-xs sm:text-sm">
                    <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <a href={`tel:${app.phone}`} className="hover:text-blue-600">{app.phone}</a>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 text-xs sm:text-sm">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>{app.city}, {app.state}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 text-xs sm:text-sm">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>{new Date(app.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                {app.professional_references && (
                  <div className="mb-3 sm:mb-4">
                    <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Referências:</p>
                    <p className="text-gray-600 text-xs sm:text-sm bg-gray-50 p-2 sm:p-3 rounded">{app.professional_references}</p>
                  </div>
                )}

                {app.status === 'pending' && (
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={() => updateApplicationStatus(app.id, 'approved')}
                      className="flex-1 flex items-center justify-center gap-1 sm:gap-2 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-medium text-xs sm:text-sm"
                    >
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      Aprovar
                    </button>
                    <button
                      onClick={() => updateApplicationStatus(app.id, 'rejected')}
                      className="flex-1 flex items-center justify-center gap-1 sm:gap-2 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors font-medium text-xs sm:text-sm"
                    >
                      <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      Rejeitar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <NotificationPopup
        isOpen={showNotification}
        message={notificationMessage}
        onClose={() => setShowNotification(false)}
      />
    </div>
  );
}
