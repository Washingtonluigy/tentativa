import React, { useState, useEffect } from 'react';
import { Plus, Briefcase, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Service {
  id: string;
  service_name: string;
  description: string;
}

export function ServiceManagement() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    serviceName: '',
    description: '',
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
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setProfessionalId(data.id);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!professionalId) return;

    await supabase
      .from('professional_services')
      .insert([{
        professional_id: professionalId,
        service_name: formData.serviceName,
        description: formData.description,
      }]);

    setFormData({ serviceName: '', description: '' });
    setShowForm(false);
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
          <h2 className="text-2xl font-bold text-gray-800">Novo Serviço</h2>
          <button
            onClick={() => setShowForm(false)}
            className="text-gray-600 hover:text-gray-800"
          >
            Voltar
          </button>
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
              placeholder="Ex: Fisioterapia, Massagem"
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
              rows={4}
              placeholder="Descreva o serviço que você oferece"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition"
          >
            Cadastrar Serviço
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Meus Serviços</h2>
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
            className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
          >
            <div className="flex items-start gap-3">
              <div className="bg-teal-100 p-3 rounded-lg">
                <Briefcase className="w-6 h-6 text-teal-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{service.service_name}</h3>
                {service.description && (
                  <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(service.id)}
                className="p-2 hover:bg-red-50 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
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
            Cadastre os serviços que você oferece para que os clientes possam encontrá-lo
          </p>
        </div>
      )}
    </div>
  );
}
