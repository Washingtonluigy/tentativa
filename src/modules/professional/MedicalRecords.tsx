import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Plus, X, User, Calendar, Network, Eye } from 'lucide-react';

interface MedicalRecord {
  id: string;
  client_id: string;
  network_id: string;
  professional_id: string;
  service_request_id: string | null;
  record_type: string;
  title: string;
  content: string;
  attachments: any[];
  created_at: string;
  updated_at: string;
  client_name?: string;
  professional_name?: string;
  network_name?: string;
}

interface Client {
  id: string;
  full_name: string;
  email: string;
}

interface HealthcareNetwork {
  id: string;
  name: string;
}

export default function MedicalRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [networks, setNetworks] = useState<HealthcareNetwork[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    client_id: '',
    network_id: '',
    record_type: 'consultation',
    title: '',
    content: ''
  });

  useEffect(() => {
    loadNetworks();
  }, [user]);

  useEffect(() => {
    if (selectedNetwork) {
      loadClientsInNetwork(selectedNetwork);
      loadRecords();
    }
  }, [selectedNetwork]);

  useEffect(() => {
    if (selectedClient) {
      loadRecords();
    }
  }, [selectedClient]);

  const loadNetworks = async () => {
    if (!user?.id) return;

    try {
      const { data: professionalNetworks, error } = await supabase
        .from('professional_networks')
        .select('network_id, healthcare_networks(id, name)')
        .eq('professional_id', user.id)
        .eq('active', true);

      if (error) throw error;

      const networksData = professionalNetworks?.map((pn: any) => ({
        id: pn.healthcare_networks.id,
        name: pn.healthcare_networks.name
      })) || [];

      setNetworks(networksData);
      if (networksData.length > 0) {
        setSelectedNetwork(networksData[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar redes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientsInNetwork = async (networkId: string) => {
    try {
      const { data: clientNetworks, error } = await supabase
        .from('client_networks')
        .select('client_id, users(id, profiles(full_name))')
        .eq('network_id', networkId)
        .eq('active', true);

      if (error) throw error;

      const clientsData = clientNetworks?.map((cn: any) => ({
        id: cn.users.id,
        full_name: cn.users.profiles?.[0]?.full_name || 'Sem nome',
        email: ''
      })) || [];

      setClients(clientsData);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const loadRecords = async () => {
    if (!selectedNetwork) return;

    try {
      let query = supabase
        .from('medical_records')
        .select('*')
        .eq('network_id', selectedNetwork)
        .order('created_at', { ascending: false });

      if (selectedClient) {
        query = query.eq('client_id', selectedClient);
      }

      const { data, error } = await query;

      if (error) throw error;

      const recordsWithDetails = await Promise.all(
        (data || []).map(async (record) => {
          const [clientData, professionalData, networkData] = await Promise.all([
            supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', record.client_id)
              .maybeSingle(),
            supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', record.professional_id)
              .maybeSingle(),
            supabase
              .from('healthcare_networks')
              .select('name')
              .eq('id', record.network_id)
              .maybeSingle()
          ]);

          return {
            ...record,
            client_name: clientData.data?.full_name || 'Desconhecido',
            professional_name: professionalData.data?.full_name || 'Desconhecido',
            network_name: networkData.data?.name || 'Desconhecido'
          };
        })
      );

      setRecords(recordsWithDetails);

      if (user?.id) {
        for (const record of data || []) {
          await supabase.from('medical_record_access_logs').insert({
            medical_record_id: record.id,
            professional_id: user.id,
            action: 'view'
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar prontuários:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) return;

    try {
      const { error } = await supabase.from('medical_records').insert({
        ...formData,
        professional_id: user.id,
        network_id: selectedNetwork
      });

      if (error) throw error;

      await supabase.from('medical_record_access_logs').insert({
        medical_record_id: '',
        professional_id: user.id,
        action: 'create'
      });

      setShowForm(false);
      setFormData({
        client_id: '',
        network_id: '',
        record_type: 'consultation',
        title: '',
        content: ''
      });
      loadRecords();
      alert('Prontuário criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar prontuário:', error);
      alert('Erro ao criar prontuário');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (networks.length === 0) {
    return (
      <div className="p-6 text-center">
        <Network className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          Você não está vinculado a nenhuma rede
        </h3>
        <p className="text-gray-600">
          Entre em contato com o administrador para ser vinculado a uma rede de saúde.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 pb-24">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-teal-600" />
          <h1 className="text-3xl font-bold text-gray-800">Prontuários Médicos</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Prontuário
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rede de Saúde
            </label>
            <select
              value={selectedNetwork}
              onChange={(e) => {
                setSelectedNetwork(e.target.value);
                setSelectedClient('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            >
              {networks.map((network) => (
                <option key={network.id} value={network.id}>
                  {network.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Paciente
            </label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Todos os pacientes</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Novo Prontuário</h2>
              <button onClick={() => setShowForm(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paciente *
                </label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  required
                >
                  <option value="">Selecione um paciente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Registro *
                </label>
                <select
                  value={formData.record_type}
                  onChange={(e) => setFormData({ ...formData, record_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  required
                >
                  <option value="consultation">Consulta</option>
                  <option value="exam">Exame</option>
                  <option value="prescription">Receita</option>
                  <option value="diagnosis">Diagnóstico</option>
                  <option value="treatment">Tratamento</option>
                  <option value="note">Observação</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  required
                  placeholder="Ex: Consulta de retorno, Resultado de exame, etc"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conteúdo *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  rows={8}
                  required
                  placeholder="Descreva os sintomas, diagnóstico, tratamento, observações, etc"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Salvar Prontuário
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{selectedRecord.title}</h2>
              <button onClick={() => setSelectedRecord(null)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-700">Paciente:</span>
                  <p className="text-gray-600">{selectedRecord.client_name}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Profissional:</span>
                  <p className="text-gray-600">{selectedRecord.professional_name}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Rede:</span>
                  <p className="text-gray-600">{selectedRecord.network_name}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Tipo:</span>
                  <p className="text-gray-600 capitalize">{selectedRecord.record_type}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Data:</span>
                  <p className="text-gray-600">
                    {new Date(selectedRecord.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-700 mb-2">Conteúdo:</h3>
                <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">
                  {selectedRecord.content}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setSelectedRecord(null)}
                className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {records.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {selectedClient
                ? 'Nenhum prontuário encontrado para este paciente'
                : 'Nenhum prontuário cadastrado ainda'}
            </p>
          </div>
        ) : (
          records.map((record) => (
            <div
              key={record.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedRecord(record)}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{record.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{record.client_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(record.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-medium capitalize">
                  {record.record_type}
                </span>
              </div>

              <p className="text-gray-600 text-sm line-clamp-2 mb-3">{record.content}</p>

              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-sm text-gray-500">
                  Por: {record.professional_name}
                </span>
                <button className="flex items-center gap-1 text-teal-600 hover:text-teal-700 transition-colors">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">Ver detalhes</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
