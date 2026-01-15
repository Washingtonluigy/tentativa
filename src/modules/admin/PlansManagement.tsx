import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, Edit, Trash2, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { RegionalPricing } from './RegionalPricing';
import { NotificationPopup } from '../../components/NotificationPopup';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_type: string;
  hours?: number;
  days?: number;
  periods?: string[];
  locations?: string[];
}

export function PlansManagement() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'regional'>('plans');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    durationType: '',
    hours: '',
    days: '',
    periods: [] as string[],
    locations: [] as string[],
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    const { data } = await supabase
      .from('plans')
      .select('*')
      .order('price');

    if (data) {
      setPlans(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const durationType = `${formData.hours}h/${formData.days}d`;

    if (editingId) {
      const { error } = await supabase
        .from('plans')
        .update({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          duration_type: durationType,
          hours: formData.hours ? parseInt(formData.hours) : null,
          days: formData.days ? parseInt(formData.days) : null,
          periods: formData.periods,
          locations: formData.locations,
        })
        .eq('id', editingId);

      if (error) {
        console.error('Erro ao atualizar plano:', error);
        setNotificationMessage('Erro ao atualizar plano: ' + error.message);
        setShowNotification(true);
        return;
      }
    } else {
      const { error } = await supabase
        .from('plans')
        .insert([{
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          duration_type: durationType,
          hours: formData.hours ? parseInt(formData.hours) : null,
          days: formData.days ? parseInt(formData.days) : null,
          periods: formData.periods,
          locations: formData.locations,
          created_by: user?.id
        }]);

      if (error) {
        console.error('Erro ao criar plano:', error);
        setNotificationMessage('Erro ao criar plano: ' + error.message);
        setShowNotification(true);
        return;
      }
    }

    setFormData({ name: '', description: '', price: '', durationType: '', hours: '', days: '', periods: [], locations: [] });
    setEditingId(null);
    setShowForm(false);
    loadPlans();
  };

  const handleEdit = (plan: Plan) => {
    let hours = plan.hours?.toString() || '';
    let days = plan.days?.toString() || '';

    if (!hours && !days && plan.duration_type) {
      const match = plan.duration_type.match(/(\d+)h\/(\d+)d/);
      if (match) {
        hours = match[1];
        days = match[2];
      }
    }

    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price.toString(),
      durationType: plan.duration_type,
      hours,
      days,
      periods: plan.periods || [],
      locations: plan.locations || [],
    });
    setEditingId(plan.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir este plano?')) {
      await supabase
        .from('plans')
        .delete()
        .eq('id', id);

      loadPlans();
    }
  };

  if (showForm) {
    return (
      <div className="p-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {editingId ? 'Editar Plano' : 'Novo Plano'}
          </h2>
          <button
            onClick={() => {
              setShowForm(false);
              setEditingId(null);
              setFormData({ name: '', description: '', price: '', durationType: '', hours: '', days: '', periods: [], locations: [] });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-gray-600 hover:text-gray-800"
          >
            Voltar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Plano
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              placeholder="Ex: Plano Por Hora"
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
              placeholder="Descreva os benefícios do plano"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preço (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Duração
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Horas</label>
                <input
                  type="number"
                  min="1"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  placeholder="Ex: 8"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Dias</label>
                <input
                  type="number"
                  min="1"
                  value={formData.days}
                  onChange={(e) => setFormData({ ...formData, days: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  placeholder="Ex: 5"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período
            </label>
            <div className="space-y-2">
              {['Manhã', 'Tarde', 'Noite'].map((period) => (
                <label key={period} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.periods.includes(period.toLowerCase())}
                    onChange={(e) => {
                      const value = period.toLowerCase();
                      if (e.target.checked) {
                        setFormData({ ...formData, periods: [...formData.periods, value] });
                      } else {
                        setFormData({ ...formData, periods: formData.periods.filter(p => p !== value) });
                      }
                    }}
                    className="w-4 h-4 text-teal-500 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <span className="text-gray-700">{period}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Local
            </label>
            <div className="space-y-2">
              {['Domiciliar', 'Hospital', 'Deslocamento'].map((location) => (
                <label key={location} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.locations.includes(location.toLowerCase())}
                    onChange={(e) => {
                      const value = location.toLowerCase();
                      if (e.target.checked) {
                        setFormData({ ...formData, locations: [...formData.locations, value] });
                      } else {
                        setFormData({ ...formData, locations: formData.locations.filter(l => l !== value) });
                      }
                    }}
                    className="w-4 h-4 text-teal-500 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <span className="text-gray-700">{location}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition"
          >
            {editingId ? 'Salvar Alterações' : 'Criar Plano'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gestão de Planos e Preços</h2>
        {activeTab === 'plans' && (
          <button
            onClick={() => {
              setShowForm(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="bg-teal-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-teal-600 transition flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Novo Plano
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-3 font-medium transition-all flex items-center gap-2 ${
            activeTab === 'plans'
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <DollarSign className="w-5 h-5" />
          Planos de Serviço
        </button>
        <button
          onClick={() => setActiveTab('regional')}
          className={`px-4 py-3 font-medium transition-all flex items-center gap-2 ${
            activeTab === 'regional'
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <MapPin className="w-5 h-5" />
          Valores por Região
        </button>
      </div>

      {activeTab === 'regional' ? (
        <RegionalPricing />
      ) : (
        <>
          <div className="space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-2xl font-bold text-teal-600">
                        R$ {plan.price.toFixed(2)}
                      </span>
                      {plan.hours && plan.days && (
                        <span className="text-sm text-gray-500">
                          {plan.hours}h por {plan.days} dias
                        </span>
                      )}
                    </div>
                    {plan.periods && plan.periods.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-500">Períodos: </span>
                        <span className="text-xs text-gray-700 capitalize">
                          {plan.periods.join(', ')}
                        </span>
                      </div>
                    )}
                    {plan.locations && plan.locations.length > 0 && (
                      <div className="mt-1">
                        <span className="text-xs text-gray-500">Locais: </span>
                        <span className="text-xs text-gray-700 capitalize">
                          {plan.locations.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(plan)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {plans.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum plano cadastrado</p>
            </div>
          )}
        </>
      )}

      <NotificationPopup
        isOpen={showNotification}
        message={notificationMessage}
        onClose={() => setShowNotification(false)}
      />
    </div>
  );
}
