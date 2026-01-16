import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface DaySchedule {
  day_of_week: number;
  enabled: boolean;
  start_time: string;
  end_time: string;
  availability_id?: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Segunda-feira', short: 'Seg' },
  { value: 2, label: 'Terça-feira', short: 'Ter' },
  { value: 3, label: 'Quarta-feira', short: 'Qua' },
  { value: 4, label: 'Quinta-feira', short: 'Qui' },
  { value: 5, label: 'Sexta-feira', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' }
];

export function Schedule() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [professionalId, setProfessionalId] = useState<string>('');
  const [acceptsUrgentRequests, setAcceptsUrgentRequests] = useState(false);
  const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>(
    DAYS_OF_WEEK.map(day => ({
      day_of_week: day.value,
      enabled: false,
      start_time: '08:00',
      end_time: '18:00'
    }))
  );

  useEffect(() => {
    loadProfessionalData();
  }, [user]);

  const loadProfessionalData = async () => {
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profData, error } = await supabase
        .from('professionals')
        .select('id, accepts_urgent_requests')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !profData) {
        setLoading(false);
        return;
      }

      setProfessionalId(profData.id);
      setAcceptsUrgentRequests(profData.accepts_urgent_requests || false);
      await loadAvailability(profData.id);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setLoading(false);
    }
  };

  const loadAvailability = async (profId: string) => {
    try {
      const { data, error } = await supabase
        .from('professional_availability')
        .select('*')
        .eq('professional_id', profId)
        .eq('is_active', true);

      if (error) throw error;

      const newSchedule = DAYS_OF_WEEK.map(day => {
        const existing = data?.find(a => a.day_of_week === day.value);
        if (existing) {
          return {
            day_of_week: day.value,
            enabled: true,
            start_time: existing.start_time.slice(0, 5),
            end_time: existing.end_time.slice(0, 5),
            availability_id: existing.id
          };
        }
        return {
          day_of_week: day.value,
          enabled: false,
          start_time: '08:00',
          end_time: '18:00'
        };
      });

      setWeekSchedule(newSchedule);
    } catch (err) {
      console.error('Erro ao carregar disponibilidade:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = (dayIndex: number) => {
    setWeekSchedule(prev =>
      prev.map((day, idx) =>
        idx === dayIndex ? { ...day, enabled: !day.enabled } : day
      )
    );
  };

  const handleTimeChange = (dayIndex: number, field: 'start_time' | 'end_time', value: string) => {
    setWeekSchedule(prev =>
      prev.map((day, idx) =>
        idx === dayIndex ? { ...day, [field]: value } : day
      )
    );
  };

  const handleSaveSchedule = async () => {
    if (!professionalId) return;

    setSaving(true);
    try {
      // Salvar configuração de urgência
      await supabase
        .from('professionals')
        .update({ accepts_urgent_requests: acceptsUrgentRequests })
        .eq('id', professionalId);

      // Deletar todos os horários existentes
      await supabase
        .from('professional_availability')
        .delete()
        .eq('professional_id', professionalId);

      // Inserir apenas os dias habilitados
      const enabledDays = weekSchedule.filter(day => day.enabled);
      if (enabledDays.length > 0) {
        const insertData = enabledDays.map(day => ({
          professional_id: professionalId,
          day_of_week: day.day_of_week,
          start_time: day.start_time,
          end_time: day.end_time,
          is_active: true
        }));

        const { error } = await supabase
          .from('professional_availability')
          .insert(insertData);

        if (error) throw error;
      }

      alert('Horários salvos com sucesso!');
      await loadAvailability(professionalId);
    } catch (err) {
      console.error('Erro ao salvar horários:', err);
      alert('Erro ao salvar horários. Tente novamente.');
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="p-4 pb-20 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Minha Agenda</h2>
          <p className="text-gray-600 text-sm mt-1">Configure os dias e horários que você trabalha</p>
        </div>

        {/* Atendimento Urgente */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl shadow-lg p-6 mb-6 border-2 border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
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
              <span className="text-green-700 font-medium">✅ Você aparecerá nas buscas de urgência</span>
            ) : (
              <span className="text-gray-600">Você não aparecerá nas buscas de urgência</span>
            )}
          </p>
        </div>

        {/* Configuração de Dias e Horários */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-teal-600" />
            <div>
              <h3 className="text-xl font-bold text-gray-800">Dias e Horários de Trabalho</h3>
              <p className="text-sm text-gray-600">Marque os dias que você trabalha e defina os horários</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Como funciona:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Marque os dias da semana que você atende</li>
                <li>Defina o horário de início e fim para cada dia</li>
                <li>Você só aparecerá disponível nos dias/horários configurados</li>
                <li>Clientes não poderão solicitar atendimento fora desses períodos</li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            {weekSchedule.map((day, index) => (
              <div
                key={day.day_of_week}
                className={`border-2 rounded-xl p-4 transition-all ${
                  day.enabled
                    ? 'border-teal-300 bg-teal-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={() => handleToggleDay(index)}
                      className="w-6 h-6 text-teal-600 border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                    />
                    <span className={`font-semibold text-lg min-w-[140px] ${
                      day.enabled ? 'text-teal-900' : 'text-gray-500'
                    }`}>
                      {DAYS_OF_WEEK[index].label}
                    </span>
                  </label>

                  {day.enabled && (
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <input
                          type="time"
                          value={day.start_time}
                          onChange={(e) => handleTimeChange(index, 'start_time', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <span className="text-gray-500 font-medium">até</span>
                      <input
                        type="time"
                        value={day.end_time}
                        onChange={(e) => handleTimeChange(index, 'end_time', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <button
            onClick={handleSaveSchedule}
            disabled={saving}
            className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-teal-700 transition disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg"
          >
            <Save className="w-6 h-6" />
            {saving ? 'Salvando...' : 'Salvar Horários'}
          </button>

          {weekSchedule.filter(d => d.enabled).length === 0 && (
            <p className="text-center text-amber-600 text-sm mt-4 font-medium">
              ⚠️ Atenção: Você não aparecerá nas buscas até configurar pelo menos um dia de trabalho
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
