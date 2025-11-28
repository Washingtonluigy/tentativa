import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '../../lib/supabase';
import { X, MapPin, Navigation, AlertCircle } from 'lucide-react';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface ClientGPSTrackingProps {
  serviceRequestId: string;
  onClose: () => void;
}

interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

interface ServiceLocation {
  user_type: 'client' | 'professional';
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

export default function ClientGPSTracking({ serviceRequestId, onClose }: ClientGPSTrackingProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [clientLocation, setClientLocation] = useState<Location | null>(null);
  const [professionalLocation, setProfessionalLocation] = useState<Location | null>(null);
  const [tracking, setTracking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const markersRef = useRef<{ professional?: mapboxgl.Marker; client?: mapboxgl.Marker }>({});

  useEffect(() => {
    startTracking();
    const interval = setInterval(loadLocations, 5000);

    return () => {
      stopTracking();
      clearInterval(interval);
    };
  }, []);

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
  }, []);

  useEffect(() => {
    if (map.current && (clientLocation || professionalLocation)) {
      updateMapMarkers();
      fitMapToBounds();
    }
  }, [clientLocation, professionalLocation]);

  const loadLocations = async () => {
    const { data, error } = await supabase
      .from('service_locations')
      .select('*')
      .eq('service_request_id', serviceRequestId)
      .eq('is_active', true)
      .order('timestamp', { ascending: false })
      .limit(2);

    if (error) {
      console.error('Error loading locations:', error);
      return;
    }

    if (data) {
      const clientLoc = data.find((loc: ServiceLocation) => loc.user_type === 'client');
      const profLoc = data.find((loc: ServiceLocation) => loc.user_type === 'professional');

      if (clientLoc) {
        setClientLocation({
          latitude: Number(clientLoc.latitude),
          longitude: Number(clientLoc.longitude),
          accuracy: Number(clientLoc.accuracy),
          timestamp: clientLoc.timestamp
        });
      }

      if (profLoc) {
        setProfessionalLocation({
          latitude: Number(profLoc.latitude),
          longitude: Number(profLoc.longitude),
          accuracy: Number(profLoc.accuracy),
          timestamp: profLoc.timestamp
        });
      }
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocalização não disponível neste navegador');
      return;
    }

    const userData = localStorage.getItem('currentUser');
    if (!userData) return;

    const user = JSON.parse(userData);

    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const location = {
          service_request_id: serviceRequestId,
          user_id: user.id,
          user_type: 'client',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: new Date().toISOString(),
          is_active: true
        };

        setClientLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        });

        await supabase
          .from('service_locations')
          .upsert(location, {
            onConflict: 'service_request_id,user_id',
            ignoreDuplicates: false
          });
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError('Erro ao obter localização. Verifique as permissões.');
        setTracking(false);
      },
      options
    );
  };

  const stopTracking = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const userData = localStorage.getItem('currentUser');
    if (userData) {
      const user = JSON.parse(userData);
      await supabase
        .from('service_locations')
        .update({ is_active: false })
        .eq('service_request_id', serviceRequestId)
        .eq('user_id', user.id)
        .eq('user_type', 'client');
    }

    setTracking(false);
  };

  const updateMapMarkers = () => {
    if (!map.current) return;

    if (clientLocation) {
      if (markersRef.current.client) {
        markersRef.current.client.setLngLat([
          clientLocation.longitude,
          clientLocation.latitude
        ]);
      } else {
        markersRef.current.client = new mapboxgl.Marker({ color: '#ef4444' })
          .setLngLat([clientLocation.longitude, clientLocation.latitude])
          .setPopup(new mapboxgl.Popup().setHTML('<strong>Você está aqui</strong>'))
          .addTo(map.current);
      }
    }

    if (professionalLocation) {
      if (markersRef.current.professional) {
        markersRef.current.professional.setLngLat([
          professionalLocation.longitude,
          professionalLocation.latitude
        ]);
      } else {
        const el = document.createElement('div');
        el.className = 'professional-marker';
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.backgroundImage = 'url(https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png)';
        el.style.backgroundSize = 'cover';

        markersRef.current.professional = new mapboxgl.Marker({ element: el, color: '#3b82f6' })
          .setLngLat([professionalLocation.longitude, professionalLocation.latitude])
          .setPopup(new mapboxgl.Popup().setHTML('<strong>Profissional</strong>'))
          .addTo(map.current);
      }
    }
  };

  const fitMapToBounds = () => {
    if (!map.current || (!clientLocation && !professionalLocation)) return;

    const bounds = new mapboxgl.LngLatBounds();

    if (clientLocation) {
      bounds.extend([clientLocation.longitude, clientLocation.latitude]);
    }

    if (professionalLocation) {
      bounds.extend([professionalLocation.longitude, professionalLocation.latitude]);
    }

    map.current.fitBounds(bounds, { padding: 100, maxZoom: 15 });
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="bg-teal-500 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Navigation className="animate-pulse" size={24} />
          <div>
            <h2 className="text-lg font-bold">Rastreamento GPS</h2>
            <p className="text-sm text-teal-100">Acompanhe o profissional em tempo real</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-teal-600 rounded-lg transition"
        >
          <X size={24} />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border-b border-red-200 flex items-start gap-2">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div ref={mapContainer} className="flex-1" />

      <div className="bg-white border-t p-4">
        {tracking && (
          <div className="mb-3 flex items-center justify-center gap-2 text-green-600">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Rastreamento ativo</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {clientLocation && (
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={16} className="text-red-600" />
                <p className="text-xs font-semibold text-red-900">Sua Localização</p>
              </div>
              <p className="text-xs font-mono text-red-800">
                {clientLocation.latitude.toFixed(6)}, {clientLocation.longitude.toFixed(6)}
              </p>
              <p className="text-xs text-red-600 mt-1">Precisão: {clientLocation.accuracy.toFixed(0)}m</p>
            </div>
          )}
          {professionalLocation ? (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Navigation size={16} className="text-blue-600" />
                <p className="text-xs font-semibold text-blue-900">Profissional</p>
              </div>
              <p className="text-xs font-mono text-blue-800">
                {professionalLocation.latitude.toFixed(6)}, {professionalLocation.longitude.toFixed(6)}
              </p>
              <p className="text-xs text-blue-600 mt-1">Precisão: {professionalLocation.accuracy.toFixed(0)}m</p>
            </div>
          ) : (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Aguardando localização do profissional...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
