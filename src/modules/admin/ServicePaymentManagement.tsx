import React, { useState, useEffect } from 'react';
import { DollarSign, Link as LinkIcon, Save, Search, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ServiceWithProfessional {
  id: string;
  name: string;
  description: string;
  price_message: number | null;
  price_video: number | null;
  price_local: number | null;
  payment_link: string | null;
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

export function ServicePaymentManagement() {
  const [services, setServices] = useState<ServiceWithProfessional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingService, setEditingService] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState('');
  const [saving, setSaving] = useState(false);

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
          payment_link,
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

  const handleEditClick = (service: ServiceWithProfessional) => {
    setEditingService(service.id);
    setPaymentLink(service.payment_link || '');
  };

  const handleSavePaymentLink = async (serviceId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('professional_services')
        .update({ payment_link: paymentLink || null })
        .eq('id', serviceId);

      if (error) throw error;

      setServices(services.map(s =>
        s.id === serviceId ? { ...s, payment_link: paymentLink || null } : s
      ));
      setEditingService(null);
      setPaymentLink('');
    } catch (error) {
      console.error('Error saving payment link:', error);
      alert('Erro ao salvar link de pagamento');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingService(null);
    setPaymentLink('');
  };

  const getServicePrice = (service: ServiceWithProfessional) => {
    const prices = [];
    if (service.price_message) prices.push(`Mensagem: R$ ${service.price_message.toFixed(2)}`);
    if (service.price_video) prices.push(`Vídeo: R$ ${service.price_video.toFixed(2)}`);
    if (service.price_local) prices.push(`Presencial: R$ ${service.price_local.toFixed(2)}`);
    return prices.length > 0 ? prices.join(' | ') : 'Sem preço definido';
  };

  const filteredServices = services.filter(service => {
    const professionalName = service.professional.users.profiles[0]?.full_name || '';
    const searchLower = searchTerm.toLowerCase();
    return (
      service.name.toLowerCase().includes(searchLower) ||
      professionalName.toLowerCase().includes(searchLower) ||
      service.professional.users.email.toLowerCase().includes(searchLower)
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Valor de Serviços</h2>
          <p className="text-gray-600 mt-1">Gerencie os links de pagamento dos serviços</p>
        </div>
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

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Serviço
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Profissional
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Valores
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Link de Pagamento
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredServices.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-semibold text-gray-900">{service.name}</div>
                      {service.description && (
                        <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {service.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">
                        {service.professional.users.profiles[0]?.full_name || 'Sem nome'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {service.professional.users.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {getServicePrice(service)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {editingService === service.id ? (
                      <input
                        type="url"
                        value={paymentLink}
                        onChange={(e) => setPaymentLink(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        {service.payment_link ? (
                          <>
                            <LinkIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <a
                              href={service.payment_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 truncate max-w-xs"
                            >
                              {service.payment_link}
                            </a>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">Sem link</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {service.payment_link ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" />
                        Configurado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                        <XCircle className="w-3 h-3" />
                        Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingService === service.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSavePaymentLink(service.id)}
                          disabled={saving}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                          <Save className="w-4 h-4" />
                          Salvar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={saving}
                          className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditClick(service)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                      >
                        <DollarSign className="w-4 h-4" />
                        {service.payment_link ? 'Editar' : 'Adicionar'} Link
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}
            </h3>
            <p className="text-gray-600">
              {searchTerm ? 'Tente buscar com outros termos' : 'Aguardando profissionais cadastrarem serviços'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
