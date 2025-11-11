import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Navigation, Save, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export function GPSTracking() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!map.current && mapContainer.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-46.6333, -23.5505],
        zoom: 12
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    }

    requestLocation();

    return () => {
      if (marker.current) {
        marker.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (location && map.current) {
      updateMarker();
      map.current.flyTo({
        center: [location.lng, location.lat],
        zoom: 15,
        duration: 2000
      });
    }
  }, [location]);

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
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      setLoading(false);
      alert('Geolocalização não é suportada pelo seu navegador.');
    }
  };

  const updateMarker = () => {
    if (!map.current || !location) return;

    if (marker.current) {
      marker.current.setLngLat([location.lng, location.lat]);
    } else {
      marker.current = new mapboxgl.Marker({ color: '#14b8a6' })
        .setLngLat([location.lng, location.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML('<strong>Você está aqui</strong>')
        )
        .addTo(map.current);
    }
  };

  const handleSaveLocation = async () => {
    if (location) {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);

        await supabase
          .from('clients')
          .update({
            default_latitude: location.lat,
            default_longitude: location.lng
          })
          .eq('user_id', user.id);
      }

      localStorage.setItem('userLocation', JSON.stringify(location));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-screen pb-16">
      <div className="bg-white border-b p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Localização GPS</h2>
        <p className="text-sm text-gray-600">
          Compartilhe sua localização para atendimentos presenciais
        </p>
      </div>

      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0" />

        {!location && (
          <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center">
            <div className="text-center p-6">
              <div className="bg-teal-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-10 h-10 text-teal-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Compartilhar Localização</h3>
              <p className="text-sm text-gray-600 mb-4">
                Permita que os profissionais vejam sua localização
              </p>
              <button
                onClick={requestLocation}
                disabled={loading}
                className="bg-teal-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-teal-600 transition disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
              >
                <Navigation className="w-5 h-5" />
                {loading ? 'Obtendo localização...' : 'Ativar Localização'}
              </button>
            </div>
          </div>
        )}
      </div>

      {location && (
        <div className="bg-white border-t p-4 space-y-3">
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <MapPin className="text-teal-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-teal-900 mb-1">Localização Atual</p>
                <p className="text-xs font-mono text-teal-700">
                  Lat: {location.lat.toFixed(6)}
                </p>
                <p className="text-xs font-mono text-teal-700">
                  Lng: {location.lng.toFixed(6)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleSaveLocation}
              className={`py-2.5 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-teal-500 text-white hover:bg-teal-600'
              }`}
            >
              <Save size={18} />
              {saved ? 'Salva!' : 'Salvar'}
            </button>

            <button
              onClick={requestLocation}
              disabled={loading}
              className="bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-900 mb-1">Privacidade e Segurança</p>
            <ul className="text-xs text-blue-800 space-y-0.5">
              <li>• Compartilhada apenas durante atendimentos presenciais</li>
              <li>• Profissionais veem após aceitar o chamado</li>
              <li>• Pode desativar a qualquer momento</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
