import React, { useState, useEffect } from 'react';
import { User, MapPin, Mail, Phone, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationPopup } from '../../components/NotificationPopup';

interface City {
  id: string;
  state: string;
  city: string;
}

export function ClientProfile({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showNotification, setShowNotification] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    state: '',
    city: '',
  });

  useEffect(() => {
    loadProfile();
    loadStates();
  }, []);

  useEffect(() => {
    if (formData.state) {
      loadCitiesByState(formData.state);
    }
  }, [formData.state]);

  const loadProfile = async () => {
    if (!user?.id) return;

    const { data: userData } = await supabase
      .from('users')
      .select('email, state, city')
      .eq('id', user.id)
      .maybeSingle();

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('user_id', user.id)
      .maybeSingle();

    if (userData && profileData) {
      setFormData({
        fullName: profileData.full_name || '',
        email: userData.email || '',
        phone: profileData.phone || '',
        state: userData.state || '',
        city: userData.city || '',
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
      setNotificationMessage('Por favor, selecione seu estado e cidade');
      setShowNotification(true);
      return;
    }

    setSaving(true);

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      const { error: userError } = await supabase
        .from('users')
        .update({
          state: formData.state,
          city: formData.city,
        })
        .eq('id', user.id);

      if (userError) throw userError;

      setNotificationMessage('Perfil atualizado com sucesso!');
      setShowNotification(true);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      setNotificationMessage('Erro ao atualizar perfil: ' + error.message);
      setShowNotification(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 w-full max-w-md">
          <p className="text-center text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Meu Perfil</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Nome Completo
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email não pode ser alterado</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Telefone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Estado
              </label>
              <select
                value={formData.state}
                onChange={(e) => {
                  setFormData({ ...formData, state: e.target.value, city: '' });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              >
                <option value="">Selecione um estado</option>
                {states.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {formData.state && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Cidade
                </label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                >
                  <option value="">Selecione uma cidade</option>
                  {cities.map((cityObj) => (
                    <option key={cityObj.id} value={cityObj.city}>
                      {cityObj.city}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-4 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>

      <NotificationPopup
        isOpen={showNotification}
        message={notificationMessage}
        onClose={() => setShowNotification(false)}
      />
    </>
  );
}
