import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, Save, Search, MessageSquare, Video, MapPin, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { NotificationPopup } from '../../components/NotificationPopup';

interface ServiceWithProfessional {
  id: string;
  name: string;
  description: string;
  price_message: number | null;
  price_video: number | null;
  price_local: number | null;
  payment_link_message: string | null;
  payment_link_video: string | null;
  payment_link_local: string | null;
  is_active: boolean;
  professional_id: string;
  professional: {
    id: string;
    user_id: string;
    users: {
      email: string;
      profiles: {
        full_name: string;
      }[];
    };
  };
}

interface ServiceRow {
  serviceId: string;
  serviceName: string;
  professionalName: string;
  professionalEmail: string;
  serviceType: 'message' | 'video' | 'local';
  price: number;
  paymentLink: string | null;
}

export function ServicePaymentManagement() {
  const [services, setServices] = useState<ServiceWithProfessional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('professional_services')
        .select(`
          id,
          name,
          description,
          price_message,
          price_video,
          price_local,
          payment_link_message,
          payment_link_video,
          payment_link_local,
          is_active,
          professional_id,
          professionals!inner (
            id,
            user_id,
            users!inner (
              email,
              profiles (
                full_name
              )
            )
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const formattedData = data?.map((service: any) => ({
        ...service,
        payment_link_message: service.payment_link_message || null,
        payment_link_video: service.payment_link_video || null,
        payment_link_local: service.payment_link_local || null,
        professional: {
          id: service.professionals.id,
          user_id: service.professionals.user_id,
          users: {
            email: service.professionals.users.email,
            profiles: service.professionals.users.profiles || []
          }
        }
      })) || [];

      setServices(formattedData);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const createServiceRows = (): ServiceRow[] => {
    const rows: ServiceRow[] = [];

    services.forEach(service => {
      const professionalName = service.professional.users.profiles[0]?.full_name || 'Sem nome';
      const professionalEmail = service.professional.users.email;

      if (service.price_message) {
        rows.push({
          serviceId: service.id,
          serviceName: service.name,
          professionalName,
          professionalEmail,
          serviceType: 'message',
          price: service.price_message,
          paymentLink: service.payment_link_message
        });
      }

      if (service.price_video) {
        rows.push({
          serviceId: service.id,
          serviceName: service.name,
          professionalName,
          professionalEmail,
          serviceType: 'video',
          price: service.price_video,
          paymentLink: service.payment_link_video
        });
      }

      if (service.price_local) {
        rows.push({
          serviceId: service.id,
          serviceName: service.name,
          professionalName,
          professionalEmail,
          serviceType: 'local',
          price: service.price_local,
          paymentLink: service.payment_link_local
        });
      }
    });

    return rows;
  };

  const handleEditClick = (row: ServiceRow) => {
    const rowId = `${row.serviceId}-${row.serviceType}`;
    setEditingRow(rowId);
    setPaymentLink(row.paymentLink || '');
  };

  const handleSavePaymentLink = async (row: ServiceRow) => {
    setSaving(true);
    try {
      const columnMap = {
        message: 'payment_link_message',
        video: 'payment_link_video',
        local: 'payment_link_local'
      };

      const column = columnMap[row.serviceType];

      const { error } = await supabase
        .from('professional_services')
        .update({ [column]: paymentLink || null })
        .eq('id', row.serviceId);

      if (error) throw error;

      await loadServices();
      setEditingRow(null);
      setPaymentLink('');
    } catch (error) {
      console.error('Error saving payment link:', error);
      setNotificationMessage('Erro ao salvar link de pagamento');
      setShowNotification(true);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setPaymentLink('');
  };

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'message':
        return 'Mensagem';
      case 'video':
        return 'Vídeo';
      case 'local':
        return 'Presencial';
      default:
        return type;
    }
  };

  const getServiceTypeIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'local':
        return <MapPin className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const serviceRows = createServiceRows();

  const filteredRows = serviceRows.filter(row => {
    const searchLower = searchTerm.toLowerCase();
    return (
      row.serviceName.toLowerCase().includes(searchLower) ||
      row.professionalName.toLowerCase().includes(searchLower) ||
      row.professionalEmail.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Valor de Serviços</h2>
        <p className="text-gray-600 mt-1">Gerencie os links de pagamento dos serviços</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por serviço, profissional ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Desktop: Table View */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Serviço
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Profissional
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Valores
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Link de Pagamento
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRows.map((row) => {
                const rowId = `${row.serviceId}-${row.serviceType}`;
                const isEditing = editingRow === rowId;

                return (
                  <tr key={rowId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.serviceName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {row.professionalName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {row.professionalEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-purple-600">
                          {getServiceTypeIcon(row.serviceType)}
                          <span className="text-sm font-medium">
                            {getServiceTypeLabel(row.serviceType)}:
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          R$ {row.price.toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={paymentLink}
                            onChange={(e) => setPaymentLink(e.target.value)}
                            placeholder="https://..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                          />
                          <button
                            onClick={() => handleSavePaymentLink(row)}
                            disabled={saving}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={saving}
                            className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {row.paymentLink ? (
                            <span className="text-sm text-gray-600 truncate max-w-xs flex-1">
                              {row.paymentLink.length > 30
                                ? row.paymentLink.substring(0, 30) + '...'
                                : row.paymentLink}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400 flex-1">Sem link</span>
                          )}
                          <button
                            onClick={() => handleEditClick(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium whitespace-nowrap"
                          >
                            <LinkIcon className="w-4 h-4" />
                            {row.paymentLink ? 'Editar' : 'Adicionar'} Link
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRows.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}
            </h3>
            <p className="text-gray-600">
              {searchTerm ? 'Tente buscar com outros termos' : 'Aguardando profissionais cadastrarem serviços'}
            </p>
          </div>
        )}
      </div>

      {/* Mobile: Card View */}
      <div className="md:hidden space-y-3">
        {filteredRows.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}
            </h3>
            <p className="text-gray-600 text-sm">
              {searchTerm ? 'Tente buscar com outros termos' : 'Aguardando profissionais cadastrarem serviços'}
            </p>
          </div>
        ) : (
          filteredRows.map((row) => {
            const rowId = `${row.serviceId}-${row.serviceType}`;
            const isEditing = editingRow === rowId;

            return (
              <div key={rowId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
                {/* Service Name */}
                <div className="font-semibold text-gray-900 text-lg">{row.serviceName}</div>

                {/* Professional Info */}
                <div className="border-t pt-3">
                  <div className="text-xs text-gray-500 mb-1">PROFISSIONAL</div>
                  <div className="font-medium text-gray-900">{row.professionalName}</div>
                  <div className="text-sm text-gray-600">{row.professionalEmail}</div>
                </div>

                {/* Service Type & Price */}
                <div className="border-t pt-3">
                  <div className="text-xs text-gray-500 mb-2">VALORES</div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-purple-600">
                      {getServiceTypeIcon(row.serviceType)}
                      <span className="text-sm font-medium">
                        {getServiceTypeLabel(row.serviceType)}:
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      R$ {row.price.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Payment Link */}
                <div className="border-t pt-3">
                  <div className="text-xs text-gray-500 mb-2">LINK DE PAGAMENTO</div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="url"
                        value={paymentLink}
                        onChange={(e) => setPaymentLink(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSavePaymentLink(row)}
                          disabled={saving}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                          <Save className="w-4 h-4" />
                          Salvar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={saving}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {row.paymentLink ? (
                        <div className="text-sm text-gray-600 break-all bg-gray-50 p-2 rounded">
                          {row.paymentLink}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 italic">Sem link cadastrado</div>
                      )}
                      <button
                        onClick={() => handleEditClick(row)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                      >
                        <LinkIcon className="w-4 h-4" />
                        {row.paymentLink ? 'Editar' : 'Adicionar'} Link
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <NotificationPopup
        isOpen={showNotification}
        message={notificationMessage}
        onClose={() => setShowNotification(false)}
      />
    </div>
  );
}
