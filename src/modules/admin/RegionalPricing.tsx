import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MapPin, DollarSign, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { NotificationPopup } from '../../components/NotificationPopup';

interface RegionalPrice {
  id: string;
  state: string;
  city: string | null;
  minimum_price: number;
  description: string;
  active: boolean;
  created_at: string;
}

export function RegionalPricing() {
  const [regionalPrices, setRegionalPrices] = useState<RegionalPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [formData, setFormData] = useState({
    state: '',
    city: '',
    minimum_price: '',
    description: '',
    active: true,
  });

  useEffect(() => {
    loadRegionalPrices();
  }, []);

  const loadRegionalPrices = async () => {
    try {
      const { data, error } = await supabase
        .from('regional_minimum_prices')
        .select('*')
        .order('state', { ascending: true });

      if (error) throw error;
      setRegionalPrices(data || []);
    } catch (error) {
      console.error('Erro ao carregar valores regionais:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const dataToSave = {
        state: formData.state,
        city: formData.city || null,
        minimum_price: parseFloat(formData.minimum_price),
        description: formData.description,
        active: formData.active,
      };

      if (editingId) {
        const { error } = await supabase
          .from('regional_minimum_prices')
          .update(dataToSave)
          .eq('id', editingId);

        if (error) throw error;
        setNotificationMessage('Valor regional atualizado com sucesso!');
        setShowNotification(true);
      } else {
        const { error } = await supabase
          .from('regional_minimum_prices')
          .insert([dataToSave]);

        if (error) throw error;
        setNotificationMessage('Valor regional cadastrado com sucesso!');
        setShowNotification(true);
      }

      resetForm();
      loadRegionalPrices();
    } catch (error: any) {
      setNotificationMessage('Erro: ' + error.message);
      setShowNotification(true);
    }
  };

  const handleEdit = (price: RegionalPrice) => {
    setFormData({
      state: price.state,
      city: price.city || '',
      minimum_price: price.minimum_price.toString(),
      description: price.description,
      active: price.active,
    });
    setEditingId(price.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este valor regional?')) return;

    try {
      const { error } = await supabase
        .from('regional_minimum_prices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotificationMessage('Valor regional excluído com sucesso!');
      setShowNotification(true);
      loadRegionalPrices();
    } catch (error: any) {
      setNotificationMessage('Erro ao excluir: ' + error.message);
      setShowNotification(true);
    }
  };

  const resetForm = () => {
    setFormData({
      state: '',
      city: '',
      minimum_price: '',
      description: '',
      active: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Valores Mínimos por Região</h2>
          <p className="text-gray-600 text-sm mt-1">
            Defina o valor mínimo que profissionais devem cobrar por região
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
        >
          {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showForm ? 'Cancelar' : 'Nova Região'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {editingId ? 'Editar Valor Regional' : 'Cadastrar Nova Região'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado/Região *
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Ex: Mato Grosso"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cidade (opcional)
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Ex: Cuiabá (deixe vazio para todo estado)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Mínimo (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minimum_price}
                  onChange={(e) => setFormData({ ...formData, minimum_price: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="120.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.active ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição/Justificativa
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                rows={3}
                placeholder="Explique o motivo deste valor mínimo..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                {editingId ? 'Atualizar' : 'Cadastrar'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-all"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {regionalPrices.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Nenhum valor regional cadastrado ainda.</p>
            <p className="text-gray-500 text-sm mt-1">
              Clique em "Nova Região" para começar.
            </p>
          </div>
        ) : (
          regionalPrices.map((price) => (
            <div
              key={price.id}
              className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-900">
                      {price.state}
                      {price.city && (
                        <span className="text-gray-600 font-normal"> - {price.city}</span>
                      )}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        price.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {price.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="text-2xl font-bold text-green-600">
                      R$ {price.minimum_price.toFixed(2)}
                    </span>
                    <span className="text-sm text-gray-500">valor mínimo</span>
                  </div>

                  {price.description && (
                    <p className="text-gray-600 text-sm mb-3">{price.description}</p>
                  )}

                  <p className="text-xs text-gray-400">
                    Cadastrado em: {new Date(price.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(price)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Editar"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(price.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Excluir"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
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
