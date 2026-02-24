import { useState, useEffect } from 'react';
import { X, Plus, Trash2, FileText, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface PrescriptionFormProps {
  serviceRequestId: string;
  professionalId: string;
  clientId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function PrescriptionForm({
  serviceRequestId,
  professionalId,
  clientId,
  onClose,
  onSaved,
}: PrescriptionFormProps) {
  const [patientName, setPatientName] = useState('');
  const [patientCpf, setPatientCpf] = useState('');
  const [patientBirthDate, setPatientBirthDate] = useState('');
  const [profName, setProfName] = useState('');
  const [profRegistration, setProfRegistration] = useState('');
  const [profCategory, setProfCategory] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [observations, setObservations] = useState('');
  const [medications, setMedications] = useState<Medication[]>([
    { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('full_name, cpf, birth_date')
      .eq('user_id', clientId)
      .maybeSingle();

    if (clientProfile) {
      setPatientName(clientProfile.full_name || '');
      setPatientCpf(clientProfile.cpf || '');
      setPatientBirthDate(clientProfile.birth_date || '');
    }

    const { data: profProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', professionalId)
      .maybeSingle();

    if (profProfile) {
      setProfName(profProfile.full_name || '');
    }

    const { data: profData } = await supabase
      .from('professionals')
      .select('registration_number, category_id')
      .eq('user_id', professionalId)
      .maybeSingle();

    if (profData) {
      setProfRegistration(profData.registration_number || '');
      if (profData.category_id) {
        const { data: catData } = await supabase
          .from('categories')
          .select('name')
          .eq('id', profData.category_id)
          .maybeSingle();
        if (catData) setProfCategory(catData.name || '');
      }
    }
  };

  const addMedication = () => {
    setMedications(prev => [
      ...prev,
      { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
    ]);
  };

  const removeMedication = (index: number) => {
    if (medications.length <= 1) return;
    setMedications(prev => prev.filter((_, i) => i !== index));
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    setMedications(prev =>
      prev.map((med, i) => (i === index ? { ...med, [field]: value } : med))
    );
  };

  const handleSave = async () => {
    if (!patientName.trim()) {
      alert('Preencha o nome do paciente');
      return;
    }

    const hasValidMed = medications.some(m => m.name.trim());
    if (!hasValidMed) {
      alert('Adicione pelo menos um medicamento');
      return;
    }

    setSaving(true);
    try {
      const validMeds = medications.filter(m => m.name.trim());

      await supabase.from('prescriptions').insert({
        professional_id: professionalId,
        client_id: clientId,
        service_request_id: serviceRequestId,
        patient_name: patientName,
        patient_cpf: patientCpf,
        patient_birth_date: patientBirthDate,
        professional_name: profName,
        professional_registration: profRegistration,
        professional_category: profCategory,
        medications: validMeds,
        observations,
        diagnosis,
      });

      onSaved();
    } catch (error) {
      console.error('Error saving prescription:', error);
      alert('Erro ao salvar prescricao');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-600" />
            <h3 className="text-lg font-bold text-gray-900">Criar Prescricao Medica</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="font-semibold text-blue-900 mb-3">Dados do Paciente</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CPF</label>
                  <input
                    type="text"
                    value={patientCpf}
                    onChange={e => setPatientCpf(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={patientBirthDate}
                    onChange={e => setPatientBirthDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h4 className="font-semibold text-green-900 mb-3">Dados do Profissional</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                <input
                  type="text"
                  value={profName}
                  onChange={e => setProfName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Registro (CRM/CRO/etc)</label>
                  <input
                    type="text"
                    value={profRegistration}
                    onChange={e => setProfRegistration(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Especialidade</label>
                  <input
                    type="text"
                    value={profCategory}
                    onChange={e => setProfCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Diagnostico / Avaliacao</label>
            <textarea
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
              placeholder="Descreva o diagnostico ou avaliacao clinica..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Medicamentos / Tratamento</h4>
              <button
                onClick={addMedication}
                className="flex items-center gap-1 text-teal-600 text-sm font-medium hover:text-teal-700 transition"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>

            <div className="space-y-4">
              {medications.map((med, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500">
                      Medicamento {index + 1}
                    </span>
                    {medications.length > 1 && (
                      <button
                        onClick={() => removeMedication(index)}
                        className="text-red-500 hover:text-red-700 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={med.name}
                      onChange={e => updateMedication(index, 'name', e.target.value)}
                      placeholder="Nome do medicamento"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={e => updateMedication(index, 'dosage', e.target.value)}
                        placeholder="Dosagem (ex: 500mg)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        value={med.frequency}
                        onChange={e => updateMedication(index, 'frequency', e.target.value)}
                        placeholder="Frequencia (ex: 8/8h)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <input
                      type="text"
                      value={med.duration}
                      onChange={e => updateMedication(index, 'duration', e.target.value)}
                      placeholder="Duracao (ex: 7 dias)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={med.instructions}
                      onChange={e => updateMedication(index, 'instructions', e.target.value)}
                      placeholder="Instrucoes adicionais"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Observacoes</label>
            <textarea
              value={observations}
              onChange={e => setObservations(e.target.value)}
              placeholder="Observacoes adicionais sobre o tratamento..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-teal-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-teal-600 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Salvando...' : 'Salvar Prescricao'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
