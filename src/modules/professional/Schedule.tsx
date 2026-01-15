import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, Plus, Trash2, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' }
];

export function Schedule() {
  const { user } = useAuth();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [professionalId, setProfessionalId] = useState<string>('');
  const [newSlot, setNewSlot] = useState({
    day_of_week: 1,
    start_time: '08:00',
    end_time: '17:00'
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [flexibleScheduleEnabled, setFlexibleScheduleEnabled] = useState(false);
  const [flexibleStartTime, setFlexibleStartTime] = useState('08:00');
  const [flexibleEndTime, setFlexibleEndTime] = useState('18:00');
  const [acceptsUrgentRequests, setAcceptsUrgentRequests] = useState(false);

  useEffect(() => {
    loadProfessionalData();
  }, [user]);

  const loadProfessionalData = async () => {
    try {
      if (!user) {
        console.log('Schedule: Nenhum usuário encontrado');
        setLoading(false);
        return;
      }

      console.log('Schedule: Buscando profissional para user_id:', user.id);

      const { data: profData, error } = await supabase
        .from('professionals')
        .select('id, flexible_schedule_enabled, flexible_start_time, flexible_end_time, accepts_urgent_requests')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Schedule: Erro ao buscar profissional:', error);
        setLoading(false);
        return;
      }

      console.log('Schedule: Profissional encontrado:', profData);

      if (profData) {
        setProfessionalId(profData.id);
        setFlexibleScheduleEnabled(profData.flexible_schedule_enabled || false);
        setFlexibleStartTime(profData.flexible_start_time || '08:00');
        setFlexibleEndTime(profData.flexible_end_time || '18:00');
        setAcceptsUrgentRequests(profData.accepts_urgent_requests || false);
        await loadAvailability(profData.id);
      } else {
        console.log('Schedule: Nenhum registro de profissional encontrado para este usuário');
        setLoading(false);
      }
    } catch (err) {
      console.error('Schedule: Erro ao carregar dados:', err);
      setLoading(false);
    }
  };

  const loadAvailability = async (profId: string) => {
    try {
      console.log('Carregando horários para profissional:', profId);
      const { data, error } = await supabase
        .from('professional_availability')
        .select('*')
        .eq('professional_id', profId)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;
      console.log('Horários carregados:', data);
      setAvailability(data || []);
    } catch (err) {
      console.error('Erro ao carregar disponibilidade:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFlexibleSchedule = async () => {
    if (!professionalId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('professionals')
        .update({
          flexible_schedule_enabled: flexibleScheduleEnabled,
          flexible_start_time: flexibleStartTime,
          flexible_end_time: flexibleEndTime,
          accepts_urgent_requests: acceptsUrgentRequests
        })
        .eq('id', professionalId);

      if (error) throw error;

      alert('Configurações salvas com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      alert('Erro ao salvar configurações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSlot = async () => {
    if (!professionalId) return;

    setSaving(true);
    try {
      console.log('Adicionando novo horário:', {
        professional_id: professionalId,
        day_of_week: newSlot.day_of_week,
        start_time: newSlot.start_time,
        end_time: newSlot.end_time,
        is_active: true
      });

      const { data, error } = await supabase
        .from('professional_availability')
        .insert([{
          professional_id: professionalId,
          day_of_week: newSlot.day_of_week,
          start_time: newSlot.start_time,
          end_time: newSlot.end_time,
          is_active: true
        }])
        .select();

      if (error) {
        console.error('Erro no insert:', error);
        throw error;
      }

      console.log('Horário adicionado com sucesso:', data);
      await loadAvailability(professionalId);
      setShowAddForm(false);
      setNewSlot({
        day_of_week: 1,
        start_time: '08:00',
        end_time: '17:00'
      });
      alert('Horário adicionado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao adicionar horário:', err);
      alert('Erro ao adicionar horário: ' + (err.message || 'Tente novamente.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Deseja realmente remover este horário?')) return;

    try {
      const { error } = await supabase
        .from('professional_availability')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadAvailability(professionalId);
    } catch (err) {
      console.error('Erro ao remover horário:', err);
      alert('Erro ao remover horário. Tente novamente.');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('professional_availability')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      await loadAvailability(professionalId);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const groupedAvailability = availability.reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) {
      acc[slot.day_of_week] = [];
    }
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {} as Record<number, AvailabilitySlot[]>);

  console.log('Availability array:', availability);
  console.log('Grouped availability:', groupedAvailability);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!professionalId) {
    return (
      <div className="p-4 pb-20">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <Calendar className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Perfil não encontrado</h3>
          <p className="text-gray-600">
            Você ainda não está cadastrado como profissional. Entre em contato com o administrador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Minha Agenda</h2>
          <p className="text-gray-600 text-sm mt-1">Gerencie seus horários disponíveis para atendimento</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-teal-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-teal-600 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Adicionar
        </button>
      </div>

      {/* Atendimento Urgente */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl shadow-sm p-6 mb-6 border-2 border-red-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-3 rounded-full">
              <Clock className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Atendimento Urgente</h3>
              <p className="text-sm text-gray-600">Aceite chamados urgentes dos clientes</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={acceptsUrgentRequests}
              onChange={(e) => setAcceptsUrgentRequests(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>
        <p className="mt-4 text-sm text-gray-700 bg-white p-3 rounded-lg">
          {acceptsUrgentRequests ? (
            <span className="text-green-700 font-medium">✅ Você aparecerá nas buscas de urgência dos clientes</span>
          ) : (
            <span className="text-gray-600">❌ Você não aparecerá nas buscas de urgência</span>
          )}
        </p>
      </div>

      {/* Horário de Trabalho Flexível */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 mb-6 border-2 border-blue-200">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-bold text-gray-800">Horário de Trabalho Flexível</h3>
            <p className="text-sm text-gray-600">Defina seu horário geral de disponibilidade</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="flexibleSchedule"
              checked={flexibleScheduleEnabled}
              onChange={(e) => setFlexibleScheduleEnabled(e.target.checked)}
              className="w-5 h-5 text-teal-500 border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
            />
            <label htmlFor="flexibleSchedule" className="text-gray-700 font-medium cursor-pointer">
              Ativar horário flexível (ex: 8h às 18h)
            </label>
          </div>

          {flexibleScheduleEnabled && (
            <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horário de Início
                  </label>
                  <input
                    type="time"
                    value={flexibleStartTime}
                    onChange={(e) => setFlexibleStartTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horário de Término
                  </label>
                  <input
                    type="time"
                    value={flexibleEndTime}
                    onChange={(e) => setFlexibleEndTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <strong>Nota:</strong> Com o horário flexível ativo, você estará disponível todos os dias dentro deste intervalo, além dos horários específicos que você adicionar abaixo.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleSaveFlexibleSchedule}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Salvando...' : 'Salvar Horário Flexível'}
        </button>
      </div>

      {/* Horários Específicos */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Horários Específicos</h3>
        <p className="text-sm text-gray-600">Adicione horários fixos para dias específicos da semana</p>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">Novo Horário</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dia da Semana
              </label>
              <select
                value={newSlot.day_of_week}
                onChange={(e) => setNewSlot({ ...newSlot, day_of_week: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horário Início
                </label>
                <input
                  type="time"
                  value={newSlot.start_time}
                  onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horário Fim
                </label>
                <input
                  type="time"
                  value={newSlot.end_time}
                  onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddSlot}
                disabled={saving}
                className="flex-1 bg-teal-500 text-white py-2 rounded-lg font-semibold hover:bg-teal-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {availability.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Nenhum horário cadastrado</h3>
          <p className="text-gray-600 mb-4">
            Adicione seus horários disponíveis para que os clientes possam solicitar atendimento
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {DAYS_OF_WEEK.map((day) => {
            const daySlots = groupedAvailability[day.value];
            if (!daySlots || daySlots.length === 0) return null;

            return (
              <div key={day.value} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-teal-500" />
                  <h3 className="font-semibold text-gray-800">{day.label}</h3>
                </div>
                <div className="space-y-2">
                  {daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition ${
                        slot.is_active
                          ? 'border-teal-200 bg-teal-50'
                          : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-800">
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          slot.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {slot.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleActive(slot.id, slot.is_active)}
                          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                        >
                          {slot.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
