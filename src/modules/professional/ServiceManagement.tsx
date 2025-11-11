import React, { useState, useEffect } from 'react';
import { Plus, Briefcase, Trash2, Edit, DollarSign, MessageSquare, Video, MapPin, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Service {
  id: string;
  name: string;
  description: string;
  price_message: number | null;
  price_video: number | null;
  price_local: number | null;
  is_active: boolean;
}

export function ServiceManagement() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [minimumPrice, setMinimumPrice] = useState<number>(0);
  const [formData, setFormData] = useState({
    serviceName: '',
    description: '',
    priceMessage: '',
    priceVideo: '',
    priceLocal: '',
  });

  useEffect(() => {
    loadProfessionalData();
  }, [user]);

  useEffect(() => {
    if (professionalId) {
      loadServices();
    }
  }, [professionalId]);

  const loadProfessionalData = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('professionals')
      .select('id, minimum_price')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setProfessionalId(data.id);
      setMinimumPrice(data.minimum_price || 0);
    }
  };

  const loadServices = async () => {
    if (!professionalId) return;

    const { data } = await supabase
      .from('professional_services')
      .select('*')
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false });

    if (data) {
      setServices(data);
    }
  };

  const validatePrices = (): boolean => {
    const prices = [
      formData.priceMessage ? parseFloat(formData.priceMessage) : null,
      formData.priceVideo ? parseFloat(formData.priceVideo) : null,
      formData.priceLocal ? parseFloat(formData.priceLocal) : null,
    ].filter(p => p !== null);

    if (prices.length === 0) {
      alert('Você deve definir pelo menos um tipo de atendimento com preço');
      return false;
    }

    for (const price of prices) {
      if (price! < minimumPrice) {
        alert(`Os preços não podem ser menores que R$ ${minimumPrice.toFixed(2)} (valor mínimo definido pelo administrador)`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!professionalId) return;

    if (!validatePrices()) return;

    const serviceData = {
      name: formData.serviceName,
      description: formData.description,
      price_message: formData.priceMessage ? parseFloat(formData.priceMessage) : null,
      price_video: formData.priceVideo ? parseFloat(formData.priceVideo) : null,
      price_local: formData.priceLocal ? parseFloat(formData.priceLocal) : null,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      await supabase
        .from('professional_services')
        .update(serviceData)
        .eq('id', editingId);
    } else {
      await supabase
        .from('professional_services')
        .insert([{
          ...serviceData,
          professional_id: professionalId,
        }]);
    }

    setFormData({ serviceName: '', description: '', priceMessage: '', priceVideo: '', priceLocal: '' });
    setEditingId(null);
    setShowForm(false);
    loadServices();
  };

  const handleEdit = (service: Service) => {
    setFormData({
      serviceName: service.name,
      description: service.description,
      priceMessage: service.price_message?.toString() || '',
      priceVideo: service.price_video?.toString() || '',
      priceLocal: service.price_local?.toString() || '',
    });
    setEditingId(service.id);
    setShowForm(true);
  };

  const handleToggleActive = async (serviceId: string, currentStatus: boolean) => {
    await supabase
      .from('professional_services')
      .update({ is_active: !currentStatus })
      .eq('id', serviceId);

    loadServices();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir este serviço?')) {
      await supabase
        .from('professional_services')
        .delete()
        .eq('id', id);

      loadServices();
    }
  };

  if (showForm) {
    return (
      <div className="p-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {editingId ? 'Editar Serviço' : 'Novo Serviço'}
          </h2>
          <button
            onClick={() => {
              setShowForm(false);
              setEditingId(null);
              setFormData({ serviceName: '', description: '', priceMessage: '', priceVideo: '', priceLocal: '' });
            }}
            className="text-gray-600 hover:text-gray-800"
          >
            Voltar
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-semibold">Valor Mínimo: R$ {minimumPrice.toFixed(2)}</p>
              <p className="text-xs text-blue-600 mt-1">
                Este é o valor mínimo definido pelo administrador. Você pode cobrar mais, mas não menos.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Serviço
            </label>
            <input
              type="text"
              value={formData.serviceName}
              onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              placeholder="Ex: Consulta inicial, Massagem terapêutica"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              rows={3}
              placeholder="Descreva o serviço que você oferece"
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-800 mb-3">Tipos de Atendimento e Preços</h3>
            <p className="text-sm text-gray-600 mb-4">
              Defina os preços para cada tipo de atendimento. Você pode oferecer um ou todos os tipos.
            </p>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-teal-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Atendimento por Mensagem
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min={minimumPrice}
                    value={formData.priceMessage}
                    onChange={(e) => setFormData({ ...formData, priceMessage: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                    placeholder="Deixe vazio se não oferece"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-5 h-5 text-teal-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Atendimento por Vídeo Chamada
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min={minimumPrice}
                    value={formData.priceVideo}
                    onChange={(e) => setFormData({ ...formData, priceVideo: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                    placeholder="Deixe vazio se não oferece"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-teal-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Atendimento Presencial (Local)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min={minimumPrice}
                    value={formData.priceLocal}
                    onChange={(e) => setFormData({ ...formData, priceLocal: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                    placeholder="Deixe vazio se não oferece"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition"
          >
            {editingId ? 'Salvar Alterações' : 'Cadastrar Serviço'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Meus Serviços</h2>
          <p className="text-sm text-gray-600 mt-1">
            Valor mínimo permitido: R$ {minimumPrice.toFixed(2)}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-teal-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-teal-600 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo
        </button>
      </div>

      <div className="space-y-3">
        {services.map((service) => (
          <div
            key={service.id}
            className={`bg-white rounded-xl shadow-sm p-4 border ${service.is_active ? 'border-gray-100' : 'border-gray-300 bg-gray-50'}`}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="bg-teal-100 p-3 rounded-lg">
                <Briefcase className="w-6 h-6 text-teal-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-800">{service.name}</h3>
                  {!service.is_active && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                      Inativo
                    </span>
                  )}
                </div>
                {service.description && (
                  <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {service.price_message && (
                <div className="bg-teal-50 p-2 rounded-lg text-center">
                  <MessageSquare className="w-4 h-4 text-teal-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">Mensagem</p>
                  <p className="text-sm font-semibold text-gray-800">
                    R$ {service.price_message.toFixed(2)}
                  </p>
                </div>
              )}
              {service.price_video && (
                <div className="bg-teal-50 p-2 rounded-lg text-center">
                  <Video className="w-4 h-4 text-teal-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">Vídeo</p>
                  <p className="text-sm font-semibold text-gray-800">
                    R$ {service.price_video.toFixed(2)}
                  </p>
                </div>
              )}
              {service.price_local && (
                <div className="bg-teal-50 p-2 rounded-lg text-center">
                  <MapPin className="w-4 h-4 text-teal-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">Presencial</p>
                  <p className="text-sm font-semibold text-gray-800">
                    R$ {service.price_local.toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleToggleActive(service.id, service.is_active)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition ${
                  service.is_active
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                }`}
              >
                {service.is_active ? (
                  <>
                    <ToggleRight className="w-5 h-5" />
                    Desativar
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5" />
                    Ativar
                  </>
                )}
              </button>
              <button
                onClick={() => handleEdit(service)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <Edit className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => handleDelete(service.id)}
                className="p-2 hover:bg-red-50 rounded-lg transition"
              >
                <Trash2 className="w-5 h-5 text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12">
          <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Nenhum serviço cadastrado</p>
          <p className="text-sm text-gray-500">
            Cadastre os serviços que você oferece para que os clientes possam contratá-los
          </p>
        </div>
      )}
    </div>
  );
}
