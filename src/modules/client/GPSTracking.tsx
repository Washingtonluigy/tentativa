import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Save } from 'lucide-react';

export function GPSTracking() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const requestLocation = () => {
    setLoading(true);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLoading(false);
        },
        (error) => {
          console.error('Erro ao obter localização:', error);
          setLoading(false);
          alert('Não foi possível obter sua localização. Verifique as permissões.');
        }
      );
    } else {
      setLoading(false);
      alert('Geolocalização não é suportada pelo seu navegador.');
    }
  };

  const handleSaveLocation = () => {
    if (location) {
      localStorage.setItem('userLocation', JSON.stringify(location));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="p-4 pb-20">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Localização GPS</h2>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-4">
        <div className="text-center mb-6">
          <div className="bg-teal-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-10 h-10 text-teal-600" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-2">Compartilhar Localização</h3>
          <p className="text-sm text-gray-600">
            Permita que os profissionais vejam sua localização para atendimentos presenciais
          </p>
        </div>

        {!location ? (
          <button
            onClick={requestLocation}
            disabled={loading}
            className="w-full bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Navigation className="w-5 h-5" />
            {loading ? 'Obtendo localização...' : 'Ativar Localização'}
          </button>
        ) : (
          <div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-2">Localização atual:</p>
              <p className="font-mono text-sm text-gray-800">
                Lat: {location.lat.toFixed(6)}
              </p>
              <p className="font-mono text-sm text-gray-800">
                Lng: {location.lng.toFixed(6)}
              </p>
            </div>

            <button
              onClick={handleSaveLocation}
              className={`w-full py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-teal-500 text-white hover:bg-teal-600'
              }`}
            >
              <Save className="w-5 h-5" />
              {saved ? 'Localização Salva!' : 'Salvar Localização'}
            </button>

            <button
              onClick={() => setLocation(null)}
              className="w-full mt-2 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              Atualizar Localização
            </button>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Privacidade e Segurança</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Sua localização é compartilhada apenas durante atendimentos presenciais</li>
          <li>• Os profissionais podem ver sua localização apenas após aceitar o chamado</li>
          <li>• Você pode desativar a localização a qualquer momento</li>
        </ul>
      </div>
    </div>
  );
}
