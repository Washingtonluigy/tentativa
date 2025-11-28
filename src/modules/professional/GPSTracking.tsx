import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '../../lib/supabase';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface ServiceRequest {
  id: string;
  client_name: string;
  service_type: string;
  status: string;
  is_home_service: boolean;
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

export default function GPSTracking() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [activeRequests, setActiveRequests] = useState<ServiceRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [professionalLocation, setProfessionalLocation] = useState<Location | null>(null);
  const [clientLocation, setClientLocation] = useState<Location | null>(null);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const markersRef = useRef<{ professional?: mapboxgl.Marker; client?: mapboxgl.Marker }>({});

  useEffect(() => {
    loadActiveRequests();
  }, []);

  useEffect(() => {
    if (selectedRequest) {
      loadLocations();
      const interval = setInterval(loadLocations, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedRequest]);

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
    if (map.current && (professionalLocation || clientLocation)) {
      updateMapMarkers();
      fitMapToBounds();
    }
  }, [professionalLocation, clientLocation]);

  const loadActiveRequests = async () => {
    const userData = localStorage.getItem('user');
    if (!userData) return;

    const user = JSON.parse(userData);

    const { data, error } = await supabase
      .from('service_requests')
      .select('id, service_type, status, client_id')
      .eq('professional_id', user.id)
      .eq('service_type', 'in_person')
      .in('status', ['accepted', 'pending']);

    if (error) {
      console.error('Error loading requests:', error);
      return;
    }

    if (data && data.length > 0) {
      const clientIds = data.map(r => r.client_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', clientIds);

      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, p.full_name]) || []
      );

      setActiveRequests(data.map(req => ({
        id: req.id,
        client_name: profilesMap.get(req.client_id) || 'Cliente',
        service_type: req.service_type,
        status: req.status,
        is_home_service: true
      })));
    } else {
      setActiveRequests([]);
    }
  };

  const loadLocations = async () => {
    if (!selectedRequest) return;

    const { data, error } = await supabase
      .from('service_locations')
      .select('*')
      .eq('service_request_id', selectedRequest)
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

  const startTracking = async (requestId: string) => {
    setSelectedRequest(requestId);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocalização não disponível neste navegador');
      return;
    }

    const userData = localStorage.getItem('user');
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
          service_request_id: requestId,
          user_id: user.id,
          user_type: 'professional',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: new Date().toISOString(),
          is_active: true
        };

        setProfessionalLocation({
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

        setTracking(true);
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

    if (selectedRequest) {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        await supabase
          .from('service_locations')
          .update({ is_active: false })
          .eq('service_request_id', selectedRequest)
          .eq('user_id', user.id)
          .eq('user_type', 'professional');
      }
    }

    setTracking(false);
    setSelectedRequest(null);
    setProfessionalLocation(null);
    setClientLocation(null);

    if (markersRef.current.professional) {
      markersRef.current.professional.remove();
      markersRef.current.professional = undefined;
    }
    if (markersRef.current.client) {
      markersRef.current.client.remove();
      markersRef.current.client = undefined;
    }
  };

  const updateMapMarkers = () => {
    if (!map.current) return;

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
          .setPopup(new mapboxgl.Popup().setHTML('<strong>Você está aqui</strong>'))
          .addTo(map.current);
      }
    }

    if (clientLocation) {
      if (markersRef.current.client) {
        markersRef.current.client.setLngLat([
          clientLocation.longitude,
          clientLocation.latitude
        ]);
      } else {
        markersRef.current.client = new mapboxgl.Marker({ color: '#ef4444' })
          .setLngLat([clientLocation.longitude, clientLocation.latitude])
          .setPopup(new mapboxgl.Popup().setHTML('<strong>Localização do Cliente</strong>'))
          .addTo(map.current);
      }
    }
  };

  const fitMapToBounds = () => {
    if (!map.current || (!professionalLocation && !clientLocation)) return;

    const bounds = new mapboxgl.LngLatBounds();

    if (professionalLocation) {
      bounds.extend([professionalLocation.longitude, professionalLocation.latitude]);
    }

    if (clientLocation) {
      bounds.extend([clientLocation.longitude, clientLocation.latitude]);
    }

    map.current.fitBounds(bounds, { padding: 100, maxZoom: 15 });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b p-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Rastreamento GPS</h2>

        {activeRequests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="mx-auto mb-2" size={48} />
            <p>Nenhum atendimento domiciliar ativo</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeRequests.map((request) => (
              <div
                key={request.id}
                className={`p-3 border rounded-lg cursor-pointer transition ${
                  selectedRequest === request.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-300'
                }`}
                onClick={() => {
                  if (selectedRequest === request.id) {
                    stopTracking();
                  } else {
                    if (tracking) stopTracking();
                    startTracking(request.id);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{request.client_name}</p>
                    <p className="text-sm text-gray-600">
                      Atendimento Domiciliar
                      {request.status === 'pending' && (
                        <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                          Pendente
                        </span>
                      )}
                      {request.status === 'accepted' && (
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          Aceito
                        </span>
                      )}
                    </p>
                  </div>
                  {selectedRequest === request.id && tracking ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <Navigation size={20} className="animate-pulse" />
                      <span className="text-sm">Rastreando</span>
                    </div>
                  ) : (
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                      Ver Localização
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>

      <div ref={mapContainer} className="flex-1" />

      {tracking && (
        <div className="bg-white border-t p-4">
          <div className="grid grid-cols-2 gap-4">
            {professionalLocation && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Sua Localização</p>
                <p className="text-sm font-mono">
                  {professionalLocation.latitude.toFixed(6)}, {professionalLocation.longitude.toFixed(6)}
                </p>
                <p className="text-xs text-gray-500">Precisão: {professionalLocation.accuracy.toFixed(0)}m</p>
              </div>
            )}
            {clientLocation && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Cliente</p>
                <p className="text-sm font-mono">
                  {clientLocation.latitude.toFixed(6)}, {clientLocation.longitude.toFixed(6)}
                </p>
                <p className="text-xs text-gray-500">Precisão: {clientLocation.accuracy.toFixed(0)}m</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
