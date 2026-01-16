import React, { useState, useEffect } from 'react';
import { MapPin, Save, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationPopup } from '../../components/NotificationPopup';

interface City {
  id: string;
  state: string;
  city: string;
}

export function MyCity() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showNotification, setShowNotification] = useState(false);

  const [formData, setFormData] = useState({
    state: '',
    city: '',
  });

  useEffect(() => {
    loadCurrentLocation();
    loadStates();
  }, []);

  useEffect(() => {
    if (formData.state) {
      loadCitiesByState(formData.state);
    }
  }, [formData.state]);

  const loadCurrentLocation = async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from('users')
      .select('state, city')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setFormData({
        state: data.state || '',
        city: data.city || '',
      });
    }

    setLoading(false);
  };

  const loadStates = async () => {
    const { data } = await supabase
      .from('brazilian_cities')
      .select('state')
      .eq('active', true)
      .order('state');

    if (data) {
      const uniqueStates = [...new Set(data.map(item => item.state))];
      setStates(uniqueStates);
    }
  };

  const loadCitiesByState = async (state: string) => {
    const { data } = await supabase
      .from('brazilian_cities')
      .select('*')
      .eq('state', state)
      .eq('active', true)
      .order('city');

    if (data) {
      setCities(data);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    if (!formData.state || !formData.city) {
      setNotificationMessage('Por favor, selecione estado e cidade');
      setShowNotification(true);
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          state: formData.state,
          city: formData.city,
        })
        .eq('id', user.id);

      if (error) throw error;

      setNotificationMessage('Localização atualizada! Recarregue a página para ver profissionais da sua nova cidade.');
      setShowNotification(true);
    } catch (error: any) {
      setNotificationMessage('Erro ao atualizar localização: ' + error.message);
      setShowNotification(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 pb-20">
        <p className="text-center text-gray-500">Carregando...</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 pb-20">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Minha Cidade</h2>
        <p className="text-sm text-gray-600 mb-6">
          Defina sua localização para ver profissionais da sua região
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Por que isso é importante?</p>
            <p>
              Ao definir sua cidade, você verá apenas profissionais que atendem na sua região,
              evitando solicitar serviços de profissionais que estão muito distantes.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Estado
            </label>
            <select
              value={formData.state}
              onChange={(e) => {
                setFormData({ ...formData, state: e.target.value, city: '' });
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            >
              <option value="">Selecione seu estado</option>
              {states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          {formData.state && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Cidade
              </label>
              <select
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              >
                <option value="">Selecione sua cidade</option>
                {cities.map((cityObj) => (
                  <option key={cityObj.id} value={cityObj.city}>
                    {cityObj.city}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.state && formData.city && (
            <div className="pt-4 border-t border-gray-200">
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Localização atual:</span>{' '}
                  {formData.city}, {formData.state}
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Salvando...' : 'Salvar Localização'}
              </button>
            </div>
          )}
        </div>

        {formData.state && formData.city && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <span className="font-medium">Importante:</span> Após salvar sua localização,
              recarregue a página para ver os profissionais disponíveis na sua cidade.
            </p>
          </div>
        )}
      </div>

      <NotificationPopup
        isOpen={showNotification}
        message={notificationMessage}
        onClose={() => setShowNotification(false)}
      />
    </>
  );
}
