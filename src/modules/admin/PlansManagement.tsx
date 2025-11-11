import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_type: string;
}

export function PlansManagement() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    durationType: '',
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

    await supabase
      .from('plans')
      .insert([{
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        duration_type: formData.durationType,
        created_by: user?.id
      }]);

    setFormData({ name: '', description: '', price: '', durationType: '' });
    setShowForm(false);
    loadPlans();
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
          <h2 className="text-2xl font-bold text-gray-800">Novo Plano</h2>
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
            <select
              value={formData.durationType}
              onChange={(e) => setFormData({ ...formData, durationType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              required
            >
              <option value="">Selecione</option>
              <option value="hour">Por Hora</option>
              <option value="session">Por Sessão</option>
              <option value="monthly">Mensal</option>
              <option value="package">Pacote</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition"
          >
            Criar Plano
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Planos e Preços</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-teal-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-teal-600 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo
        </button>
      </div>

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
                  <span className="text-sm text-gray-500 capitalize">
                    {plan.duration_type}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition">
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
    </div>
  );
}
