import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Network, Users, Plus, Edit2, Trash2, Building2 } from 'lucide-react';

interface HealthcareNetwork {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  active: boolean;
  created_at: string;
  professional_count?: number;
  client_count?: number;
}

export default function NetworkManagement() {
  const [networks, setNetworks] = useState<HealthcareNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<HealthcareNetwork | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    active: true
  });

  useEffect(() => {
    loadNetworks();
  }, []);

  const loadNetworks = async () => {
    try {
      const { data: networksData, error } = await supabase
        .from('healthcare_networks')
        .select('*')
        .order('name');

      if (error) throw error;

      const networksWithCounts = await Promise.all(
        (networksData || []).map(async (network) => {
          const { count: profCount } = await supabase
            .from('professional_networks')
            .select('*', { count: 'exact', head: true })
            .eq('network_id', network.id)
            .eq('active', true);

          const { count: clientCount } = await supabase
            .from('client_networks')
            .select('*', { count: 'exact', head: true })
            .eq('network_id', network.id)
            .eq('active', true);

          return {
            ...network,
            professional_count: profCount || 0,
            client_count: clientCount || 0
          };
        })
      );

      setNetworks(networksWithCounts);
    } catch (error) {
      console.error('Erro ao carregar redes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingNetwork) {
        const { error } = await supabase
          .from('healthcare_networks')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingNetwork.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('healthcare_networks')
          .insert([formData]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingNetwork(null);
      setFormData({ name: '', description: '', logo_url: '', active: true });
      loadNetworks();
    } catch (error) {
      console.error('Erro ao salvar rede:', error);
      alert('Erro ao salvar rede de saúde');
    }
  };

  const handleEdit = (network: HealthcareNetwork) => {
    setEditingNetwork(network);
    setFormData({
      name: network.name,
      description: network.description,
      logo_url: network.logo_url || '',
      active: network.active
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta rede? Isso removerá todos os vínculos associados.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('healthcare_networks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadNetworks();
    } catch (error) {
      console.error('Erro ao excluir rede:', error);
      alert('Erro ao excluir rede de saúde');
    }
  };

  const toggleActive = async (network: HealthcareNetwork) => {
    try {
      const { error } = await supabase
        .from('healthcare_networks')
        .update({ active: !network.active })
        .eq('id', network.id);

      if (error) throw error;
      loadNetworks();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="w-8 h-8 text-teal-600" />
          <h1 className="text-3xl font-bold text-gray-800">Redes e Convênios de Saúde</h1>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingNetwork(null);
            setFormData({ name: '', description: '', logo_url: '', active: true });
          }}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Rede
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingNetwork ? 'Editar Rede' : 'Nova Rede de Saúde'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Rede *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  required
                  placeholder="Ex: Unimed, Hapvida, etc"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  rows={3}
                  placeholder="Descrição da rede de saúde"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL do Logo
                </label>
                <input
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="https://exemplo.com/logo.png"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-teal-600"
                />
                <label htmlFor="active" className="text-sm font-medium text-gray-700">
                  Rede Ativa
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  {editingNetwork ? 'Atualizar' : 'Criar Rede'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingNetwork(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {networks.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhuma rede cadastrada ainda</p>
          </div>
        ) : (
          networks.map((network) => (
            <div
              key={network.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {network.logo_url ? (
                      <img
                        src={network.logo_url}
                        alt={network.name}
                        className="w-12 h-12 object-contain rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-teal-100 rounded flex items-center justify-center">
                        <Network className="w-6 h-6 text-teal-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{network.name}</h3>
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded ${
                          network.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {network.active ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                  </div>

                  {network.description && (
                    <p className="text-gray-600 mb-3">{network.description}</p>
                  )}

                  <div className="flex gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{network.professional_count} Profissionais</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{network.client_count} Pacientes</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(network)}
                    className={`p-2 rounded-lg transition-colors ${
                      network.active
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                    title={network.active ? 'Desativar' : 'Ativar'}
                  >
                    <Network className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleEdit(network)}
                    className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(network.id)}
                    className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
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
    </div>
  );
}
