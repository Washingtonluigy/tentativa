import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, Save, AlertCircle, MessageSquare, Video, Home, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface DateSchedule {
  specific_date: string;
  start_time: string;
  end_time: string;
  availability_id?: string;
}

export function Schedule() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [professionalId, setProfessionalId] = useState<string>('');
  const [acceptsUrgentMessage, setAcceptsUrgentMessage] = useState(false);
  const [acceptsUrgentVideo, setAcceptsUrgentVideo] = useState(false);
  const [acceptsUrgentHome, setAcceptsUrgentHome] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedules, setSchedules] = useState<DateSchedule[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    specific_date: '',
    start_time: '08:00',
    end_time: '18:00'
  });

  useEffect(() => {
    loadProfessionalData();
  }, [user]);

  useEffect(() => {
    if (professionalId) {
      loadAvailability(professionalId);
    }
  }, [professionalId, currentMonth]);

  const loadProfessionalData = async () => {
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profData, error } = await supabase
        .from('professionals')
        .select('id, accepts_urgent_message, accepts_urgent_video, accepts_urgent_home')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !profData) {
        setLoading(false);
        return;
      }

      setProfessionalId(profData.id);
      setAcceptsUrgentMessage(profData.accepts_urgent_message || false);
      setAcceptsUrgentVideo(profData.accepts_urgent_video || false);
      setAcceptsUrgentHome(profData.accepts_urgent_home || false);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setLoading(false);
    }
  };

  const loadAvailability = async (profId: string) => {
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('professional_availability')
        .select('*')
        .eq('professional_id', profId)
        .eq('is_available', true)
        .gte('specific_date', startOfMonth.toISOString().split('T')[0])
        .lte('specific_date', endOfMonth.toISOString().split('T')[0])
        .order('specific_date');

      if (error) throw error;

      setSchedules(data?.map(d => ({
        specific_date: d.specific_date,
        start_time: d.start_time?.slice(0, 5) || '08:00',
        end_time: d.end_time?.slice(0, 5) || '18:00',
        availability_id: d.id
      })) || []);
    } catch (err) {
      console.error('Erro ao carregar disponibilidade:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!professionalId || !newSchedule.specific_date) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('professional_availability')
        .insert({
          professional_id: professionalId,
          specific_date: newSchedule.specific_date,
          start_time: newSchedule.start_time,
          end_time: newSchedule.end_time,
          is_available: true,
          is_active: true
        });

      if (error) throw error;

      setShowAddForm(false);
      setNewSchedule({
        specific_date: '',
        start_time: '08:00',
        end_time: '18:00'
      });
      await loadAvailability(professionalId);
      alert('Data adicionada com sucesso!');
    } catch (err) {
      console.error('Erro ao adicionar data:', err);
      alert('Erro ao adicionar data. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSchedule = async (availabilityId: string) => {
    if (!confirm('Deseja remover esta disponibilidade?')) return;

    try {
      const { error } = await supabase
        .from('professional_availability')
        .delete()
        .eq('id', availabilityId);

      if (error) throw error;

      await loadAvailability(professionalId);
    } catch (err) {
      console.error('Erro ao remover disponibilidade:', err);
      alert('Erro ao remover disponibilidade.');
    }
  };

  const handleSaveUrgentSettings = async () => {
    if (!professionalId) return;

    setSaving(true);
    try {
      await supabase
        .from('professionals')
        .update({
          accepts_urgent_message: acceptsUrgentMessage,
          accepts_urgent_video: acceptsUrgentVideo,
          accepts_urgent_home: acceptsUrgentHome
        })
        .eq('id', professionalId);

      alert('Configurações salvas com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      alert('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const hasScheduleForDate = (day: number): boolean => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedules.some(s => s.specific_date === dateStr);
  };

  const getScheduleForDate = (day: number): DateSchedule | undefined => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedules.find(s => s.specific_date === dateStr);
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

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

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="p-4 pb-20 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Minha Agenda</h2>
          <p className="text-gray-600 text-sm mt-1">Configure as datas e horários que você trabalha</p>
        </div>

        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl shadow-lg p-6 mb-6 border-2 border-red-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Atendimento Urgente</h3>
              <p className="text-sm text-gray-600">Escolha quais tipos de urgência você aceita</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border-2 transition hover:border-blue-300"
                 style={{ borderColor: acceptsUrgentMessage ? '#3b82f6' : '#e5e7eb' }}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${acceptsUrgentMessage ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <MessageSquare className={`w-5 h-5 ${acceptsUrgentMessage ? 'text-blue-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Por Mensagem</p>
                  <p className="text-xs text-gray-500">Atendimento via chat</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={acceptsUrgentMessage}
                onChange={(e) => setAcceptsUrgentMessage(e.target.checked)}
                className="w-6 h-6 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border-2 transition hover:border-purple-300"
                 style={{ borderColor: acceptsUrgentVideo ? '#a855f7' : '#e5e7eb' }}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${acceptsUrgentVideo ? 'bg-purple-100' : 'bg-gray-100'}`}>
                  <Video className={`w-5 h-5 ${acceptsUrgentVideo ? 'text-purple-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Por Chamada de Vídeo</p>
                  <p className="text-xs text-gray-500">Atendimento por videochamada</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={acceptsUrgentVideo}
                onChange={(e) => setAcceptsUrgentVideo(e.target.checked)}
                className="w-6 h-6 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border-2 transition hover:border-green-300"
                 style={{ borderColor: acceptsUrgentHome ? '#10b981' : '#e5e7eb' }}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${acceptsUrgentHome ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Home className={`w-5 h-5 ${acceptsUrgentHome ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Atendimento Domiciliar</p>
                  <p className="text-xs text-gray-500">Atendimento no local do cliente</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={acceptsUrgentHome}
                onChange={(e) => setAcceptsUrgentHome(e.target.checked)}
                className="w-6 h-6 text-green-600 border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <button
            onClick={handleSaveUrgentSettings}
            disabled={saving}
            className="w-full mt-4 bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Configurações de Urgência'}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-teal-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-800">Calendário de Disponibilidade</h3>
                <p className="text-sm text-gray-600">Adicione as datas em que você estará disponível</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition"
            >
              <Plus className="w-5 h-5" />
              Adicionar Data
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <button onClick={previousMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h4 className="text-lg font-bold text-gray-800">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h4>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center font-semibold text-gray-600 text-sm py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {getDaysInMonth().map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square"></div>;
              }

              const hasSchedule = hasScheduleForDate(day);
              const schedule = getScheduleForDate(day);
              const isToday = new Date().toDateString() === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString();

              return (
                <div
                  key={day}
                  className={`aspect-square border-2 rounded-lg p-2 transition-all ${
                    hasSchedule
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 bg-white'
                  } ${isToday ? 'ring-2 ring-blue-400' : ''}`}
                >
                  <div className="text-center">
                    <div className={`font-semibold ${hasSchedule ? 'text-teal-900' : 'text-gray-700'}`}>
                      {day}
                    </div>
                    {hasSchedule && schedule && (
                      <div className="text-xs text-teal-700 mt-1">
                        {schedule.start_time} - {schedule.end_time}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {schedules.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-gray-800 mb-3">Disponibilidades Cadastradas:</h4>
              <div className="space-y-2">
                {schedules.map(schedule => (
                  <div
                    key={schedule.availability_id}
                    className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-teal-600" />
                      <div>
                        <p className="font-semibold text-gray-800">
                          {new Date(schedule.specific_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-sm text-gray-600">
                          {schedule.start_time} - {schedule.end_time}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => schedule.availability_id && handleRemoveSchedule(schedule.availability_id)}
                      className="p-2 hover:bg-red-100 rounded-lg transition text-red-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Adicionar Disponibilidade</h3>
                <button onClick={() => setShowAddForm(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={newSchedule.specific_date}
                    onChange={(e) => setNewSchedule({ ...newSchedule, specific_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horário de Início</label>
                  <input
                    type="time"
                    value={newSchedule.start_time}
                    onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horário de Término</label>
                  <input
                    type="time"
                    value={newSchedule.end_time}
                    onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddSchedule}
                  disabled={saving || !newSchedule.specific_date}
                  className="flex-1 bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Adicionar'}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
