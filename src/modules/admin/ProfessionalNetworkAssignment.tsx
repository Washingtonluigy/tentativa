import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Network, X, Check } from 'lucide-react';

interface HealthcareNetwork {
  id: string;
  name: string;
  logo_url: string | null;
  active: boolean;
}

interface NetworkAssignment {
  network_id: string;
  active: boolean;
}

interface Props {
  professionalId: string;
  professionalName: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ProfessionalNetworkAssignment({
  professionalId,
  professionalName,
  onClose,
  onUpdate
}: Props) {
  const [networks, setNetworks] = useState<HealthcareNetwork[]>([]);
  const [assignments, setAssignments] = useState<NetworkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [professionalId]);

  const loadData = async () => {
    try {
      const [networksRes, assignmentsRes] = await Promise.all([
        supabase
          .from('healthcare_networks')
          .select('*')
          .eq('active', true)
          .order('name'),
        supabase
          .from('professional_networks')
          .select('network_id, active')
          .eq('professional_id', professionalId)
      ]);

      if (networksRes.error) throw networksRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;

      setNetworks(networksRes.data || []);
      setAssignments(assignmentsRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAssigned = (networkId: string) => {
    return assignments.some(a => a.network_id === networkId && a.active);
  };

  const toggleAssignment = async (networkId: string) => {
    setSaving(true);
    try {
      const currentAssignment = assignments.find(a => a.network_id === networkId);

      if (currentAssignment) {
        await supabase
          .from('professional_networks')
          .update({ active: !currentAssignment.active })
          .eq('professional_id', professionalId)
          .eq('network_id', networkId);
      } else {
        await supabase
          .from('professional_networks')
          .insert({
            professional_id: professionalId,
            network_id: networkId,
            active: true
          });
      }

      await loadData();
      onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar vinculação:', error);
      alert('Erro ao atualizar vinculação');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
          <div className="text-center">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Vincular a Redes</h2>
            <p className="text-gray-600">{professionalName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {networks.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Network className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p>Nenhuma rede cadastrada ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {networks.map((network) => {
              const assigned = isAssigned(network.id);
              return (
                <div
                  key={network.id}
                  className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${
                    assigned
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => !saving && toggleAssignment(network.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {network.logo_url ? (
                        <img
                          src={network.logo_url}
                          alt={network.name}
                          className="w-10 h-10 object-contain rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-teal-100 rounded flex items-center justify-center">
                          <Network className="w-5 h-5 text-teal-600" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-800">{network.name}</h3>
                      </div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        assigned
                          ? 'bg-teal-500 text-white'
                          : 'border-2 border-gray-300'
                      }`}
                    >
                      {assigned && <Check className="w-4 h-4" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
