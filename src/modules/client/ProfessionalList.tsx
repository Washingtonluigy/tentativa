import React, { useState, useEffect } from 'react';
import { Search, User, Star, ArrowLeft, Clock, Calendar, AlertCircle, MapPin, X, MessageSquare, Video, Home } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Category {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
}

interface Professional {
  id: string;
  user_id: string;
  full_name: string;
  description: string;
  experience_years: number;
  category_name: string;
  photo_url: string;
  availability_status: 'available' | 'busy';
  next_available?: string;
}

interface ProfessionalListProps {
  onRequestService: (professionalId: string, professionalName: string) => void;
}

interface ProfessionalsByCategory {
  categoryId: string;
  categoryName: string;
  professionals: Professional[];
}

export function ProfessionalList({ onRequestService }: ProfessionalListProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [showAllByCity, setShowAllByCity] = useState(false);
  const [professionalsByCategory, setProfessionalsByCategory] = useState<ProfessionalsByCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyMode, setUrgencyMode] = useState(false);
  const [urgencyType, setUrgencyType] = useState<'message' | 'video' | 'home' | null>(null);
  const [showUrgencyTypeModal, setShowUrgencyTypeModal] = useState(false);
  const [userCity, setUserCity] = useState<string>('');
  const [userState, setUserState] = useState<string>('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<{ id: string; city: string }[]>([]);
  const [selectedFilterState, setSelectedFilterState] = useState<string>('');
  const [selectedFilterCity, setSelectedFilterCity] = useState<string>('');

  useEffect(() => {
    loadCategories();
    loadUserLocation();
    loadAvailableStates();
  }, []);

  useEffect(() => {
    if (selectedFilterState) {
      loadCitiesByState(selectedFilterState);
    }
  }, [selectedFilterState]);

  const loadUserLocation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('city, state')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setUserCity(data.city || '');
        setUserState(data.state || '');
      }
    }
  };

  useEffect(() => {
    if (selectedCategory) {
      loadProfessionals(selectedCategory);
    }
  }, [selectedCategory, urgencyMode, urgencyType]);

  useEffect(() => {
    if (showAllByCity) {
      loadAllProfessionalsByCity();
    }
  }, [showAllByCity, urgencyMode, urgencyType]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (data) {
      setCategories(data);
    }
  };

  const loadAvailableStates = async () => {
    const { data } = await supabase
      .from('brazilian_cities')
      .select('state')
      .eq('active', true)
      .order('state');

    if (data) {
      const uniqueStates = [...new Set(data.map(item => item.state))];
      setAvailableStates(uniqueStates);
    }
  };

  const loadCitiesByState = async (state: string) => {
    const { data } = await supabase
      .from('brazilian_cities')
      .select('id, city')
      .eq('state', state)
      .eq('active', true)
      .order('city');

    if (data) {
      setAvailableCities(data);
    }
  };

  const checkAvailability = async (professionalId: string) => {
    const today = new Date();
    const todayDayOfWeek = today.getDay();
    const currentTime = today.toTimeString().slice(0, 5);

    // Verificar se profissional está em atendimento
    const { data: appointments } = await supabase
      .from('scheduled_appointments')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('status', 'in_progress')
      .maybeSingle();

    if (appointments) {
      return { status: 'busy' as const };
    }

    // Verificar horários configurados do profissional
    const { data: availabilityData } = await supabase
      .from('professional_availability')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('is_active', true)
      .eq('day_of_week', todayDayOfWeek);

    // Se não tem horário configurado para hoje, está indisponível
    if (!availabilityData || availabilityData.length === 0) {
      return { status: 'busy' as const };
    }

    // Verificar se está dentro de algum dos horários de hoje
    const isWithinSchedule = availabilityData.some((slot: any) => {
      const startTime = slot.start_time.slice(0, 5);
      const endTime = slot.end_time.slice(0, 5);
      return currentTime >= startTime && currentTime <= endTime;
    });

    if (isWithinSchedule) {
      return { status: 'available' as const };
    }

    return { status: 'busy' as const };
  };

  const loadProfessionals = async (categoryId: string) => {
    let query = supabase
      .from('professionals')
      .select(`
        *,
        users!inner (
          city,
          state
        )
      `)
      .eq('category_id', categoryId)
      .eq('status', 'active');

    if (urgencyMode && urgencyType) {
      if (urgencyType === 'message') {
        query = query.eq('accepts_urgent_message', true);
      } else if (urgencyType === 'video') {
        query = query.eq('accepts_urgent_video', true);
      } else if (urgencyType === 'home') {
        query = query.eq('accepts_urgent_home', true);
      }
    }

    const { data: profData, error } = await query;

    if (!profData) {
      console.error('Error loading professionals:', error);
      setProfessionals([]);
      return;
    }

    let filteredByCity = profData;
    if (userCity && userState) {
      filteredByCity = profData.filter((p: any) =>
        p.users?.city === userCity && p.users?.state === userState
      );
    }

    const formatted = await Promise.all(
      filteredByCity.map(async (p: any) => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, photo_url')
          .eq('user_id', p.user_id)
          .maybeSingle();

        const { data: categoryData } = await supabase
          .from('categories')
          .select('name')
          .eq('id', p.category_id)
          .maybeSingle();

        const availabilityStatus = await checkAvailability(p.id);

        return {
          id: p.id,
          user_id: p.user_id,
          full_name: profileData?.full_name || 'Profissional',
          description: p.description || 'Profissional qualificado',
          experience_years: p.experience_years || 0,
          category_name: categoryData?.name || '',
          photo_url: profileData?.photo_url || '',
          availability_status: availabilityStatus.status,
        };
      })
    );

    setProfessionals(formatted);
  };

  const loadAllProfessionalsByCity = async (filterState?: string, filterCity?: string) => {
    const cityToUse = filterCity || userCity;
    const stateToUse = filterState || userState;

    if (!cityToUse || !stateToUse) return;

    const profsByCategory: ProfessionalsByCategory[] = [];

    for (const category of categories) {
      let query = supabase
        .from('professionals')
        .select(`
          id,
          user_id,
          category_id,
          description,
          experience_years,
          users!inner(city, state)
        `)
        .eq('category_id', category.id)
        .eq('status', 'active');

      if (urgencyMode && urgencyType) {
        if (urgencyType === 'message') {
          query = query.eq('accepts_urgent_message', true);
        } else if (urgencyType === 'video') {
          query = query.eq('accepts_urgent_video', true);
        } else if (urgencyType === 'home') {
          query = query.eq('accepts_urgent_home', true);
        }
      }

      const { data: profData, error } = await query;

      if (!profData) continue;

      const filteredByCity = profData.filter((p: any) =>
        p.users?.city === cityToUse && p.users?.state === stateToUse
      );

      if (filteredByCity.length === 0) continue;

      const formatted = await Promise.all(
        filteredByCity.map(async (p: any) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, photo_url')
            .eq('user_id', p.user_id)
            .maybeSingle();

          const availabilityStatus = await checkAvailability(p.id);

          return {
            id: p.id,
            user_id: p.user_id,
            full_name: profileData?.full_name || 'Profissional',
            description: p.description || 'Profissional qualificado',
            experience_years: p.experience_years || 0,
            category_name: category.name,
            photo_url: profileData?.photo_url || '',
            availability_status: availabilityStatus.status,
          };
        })
      );

      profsByCategory.push({
        categoryId: category.id,
        categoryName: category.name,
        professionals: formatted,
      });
    }

    setProfessionalsByCategory(profsByCategory);
  };

  const handleMyCityClick = () => {
    setSelectedFilterState(userState);
    setSelectedFilterCity(userCity);
    setShowLocationModal(true);
  };

  const handleApplyLocationFilter = async () => {
    if (!selectedFilterState || !selectedFilterCity) return;

    setShowLocationModal(false);
    setShowAllByCity(true);
    await loadAllProfessionalsByCity(selectedFilterState, selectedFilterCity);
  };

  if (showAllByCity) {
    let filteredBySearch = professionalsByCategory;

    if (searchTerm) {
      filteredBySearch = professionalsByCategory.map(cat => ({
        ...cat,
        professionals: cat.professionals.filter(p =>
          p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(cat => cat.professionals.length > 0);
    }

    return (
      <div className="p-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowAllByCity(false);
                setProfessionalsByCategory([]);
                setSearchTerm('');
                setUrgencyMode(false);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <h2 className="text-2xl font-bold text-gray-800">Minha Cidade</h2>
          </div>

          <button
            onClick={() => setShowUrgencyTypeModal(true)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              urgencyMode
                ? 'bg-red-500 text-white shadow-lg'
                : 'bg-white text-red-500 border-2 border-red-500 hover:bg-red-50'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            {urgencyMode && urgencyType ? (
              urgencyType === 'message' ? 'Urg.: Mensagem' :
              urgencyType === 'video' ? 'Urg.: Vídeo' :
              'Urg.: Domiciliar'
            ) : 'Urgência'}
          </button>
        </div>

        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <p className="text-sm font-medium text-blue-900">
              Profissionais de: {selectedFilterCity} - {selectedFilterState}
            </p>
          </div>
          <button
            onClick={() => setShowLocationModal(true)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium underline"
          >
            Alterar localização
          </button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar profissional..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
          />
        </div>

        {filteredBySearch.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-800 font-medium mb-2">
              Nenhum profissional encontrado
            </p>
            <p className="text-gray-600 text-sm">
              Não há profissionais cadastrados em <strong>{selectedFilterCity} - {selectedFilterState}</strong>
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredBySearch.map((category) => (
              <div key={category.categoryId}>
                <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-teal-500">
                  {category.categoryName}
                </h3>

                <div className="space-y-4">
                  {category.professionals.map((professional) => (
                    <div
                      key={professional.id}
                      className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {professional.photo_url ? (
                          <img
                            src={professional.photo_url}
                            alt={professional.full_name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-teal-100"
                          />
                        ) : (
                          <div className="bg-teal-100 p-3 rounded-full">
                            <User className="w-8 h-8 text-teal-600" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 text-lg">{professional.full_name}</h3>
                          <p className="text-sm text-teal-600">{professional.category_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center text-yellow-500">
                              <Star className="w-4 h-4 fill-current" />
                              <span className="text-sm ml-1 text-gray-700">4.8</span>
                            </div>
                            <span className="text-sm text-gray-500">
                              • {professional.experience_years} anos
                            </span>
                          </div>
                        </div>
                      </div>

                      {professional.description && (
                        <p className="text-sm text-gray-600 mb-3">{professional.description}</p>
                      )}

                      {professional.availability_status === 'available' ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                            <Clock className="w-4 h-4" />
                            <span>Disponível agora</span>
                          </div>
                          <button
                            onClick={() => onRequestService(professional.user_id, professional.full_name)}
                            className="w-full bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition"
                          >
                            Abrir Chamado
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-orange-600 text-sm font-medium bg-orange-50 px-3 py-2 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            <span>Em atendimento ou fora do horário</span>
                          </div>
                          <button
                            onClick={() => onRequestService(professional.user_id, professional.full_name)}
                            className="w-full bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition"
                          >
                            Agendar Atendimento
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (selectedCategory && professionals.length >= 0) {
    let filteredProfessionals = professionals.filter(p =>
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="p-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setProfessionals([]);
                setSearchTerm('');
                setUrgencyMode(false);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <h2 className="text-2xl font-bold text-gray-800">Profissionais</h2>
          </div>

          <button
            onClick={() => setShowUrgencyTypeModal(true)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              urgencyMode
                ? 'bg-red-500 text-white shadow-lg'
                : 'bg-white text-red-500 border-2 border-red-500 hover:bg-red-50'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            {urgencyMode && urgencyType ? (
              urgencyType === 'message' ? 'Urg.: Mensagem' :
              urgencyType === 'video' ? 'Urg.: Vídeo' :
              'Urg.: Domiciliar'
            ) : 'Urgência'}
          </button>
        </div>

        {userCity && userState && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Mostrando profissionais de: {userCity} - {userState}
              </p>
              <p className="text-xs text-blue-700">
                Apenas profissionais da sua cidade aparecem nos resultados
              </p>
            </div>
          </div>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar profissional..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
          />
        </div>

        <div className="space-y-4">
          {filteredProfessionals.map((professional) => (
            <div
              key={professional.id}
              className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
            >
              <div className="flex items-start gap-3 mb-3">
                {professional.photo_url ? (
                  <img
                    src={professional.photo_url}
                    alt={professional.full_name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-teal-100"
                  />
                ) : (
                  <div className="bg-teal-100 p-3 rounded-full">
                    <User className="w-8 h-8 text-teal-600" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 text-lg">{professional.full_name}</h3>
                  <p className="text-sm text-teal-600">{professional.category_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm ml-1 text-gray-700">4.8</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      • {professional.experience_years} anos
                    </span>
                  </div>
                </div>
              </div>

              {professional.description && (
                <p className="text-sm text-gray-600 mb-3">{professional.description}</p>
              )}

              {professional.availability_status === 'available' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    <span>Disponível agora</span>
                  </div>
                  <button
                    onClick={() => onRequestService(professional.user_id, professional.full_name)}
                    className="w-full bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition"
                  >
                    Abrir Chamado
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-orange-600 text-sm font-medium bg-orange-50 px-3 py-2 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span>Em atendimento ou fora do horário</span>
                  </div>
                  <button
                    onClick={() => onRequestService(professional.user_id, professional.full_name)}
                    className="w-full bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition"
                  >
                    Agendar Atendimento
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredProfessionals.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-800 font-medium mb-2">
              {urgencyMode
                ? 'Nenhum profissional disponível no momento'
                : 'Nenhum profissional encontrado'
              }
            </p>
            <p className="text-gray-600 text-sm">
              {userCity && userState ? (
                <>
                  Não há profissionais cadastrados em <strong>{userCity} - {userState}</strong>
                  <br />
                  <span className="text-xs text-gray-500 mt-1 block">
                    Os profissionais devem estar na sua cidade para aparecer aqui
                  </span>
                </>
              ) : (
                'Complete seu cadastro com cidade e estado para ver profissionais da sua região'
              )}
            </p>
          </div>
        )}
      </div>
    );
  }

  const getCategoryImage = (categoryName: string): string => {
    const images: { [key: string]: string } = {
      'Fisioterapeutas': 'https://images.pexels.com/photos/7659564/pexels-photo-7659564.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
      'Psicólogos': 'https://images.pexels.com/photos/4101143/pexels-photo-4101143.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
      'Nutricionistas': 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
      'Personal Trainers': 'https://images.pexels.com/photos/703012/pexels-photo-703012.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
      'Enfermeiros': 'https://images.pexels.com/photos/4386466/pexels-photo-4386466.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
      'Terapeutas': 'https://images.pexels.com/photos/3985163/pexels-photo-3985163.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
      'Médicos': 'https://images.pexels.com/photos/6129049/pexels-photo-6129049.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
      'Dentistas': 'https://images.pexels.com/photos/3845653/pexels-photo-3845653.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    };

    return images[categoryName] || 'https://images.pexels.com/photos/5699456/pexels-photo-5699456.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750';
  };

  return (
    <>
      <div className="min-h-screen pb-20" style={{
        background: 'linear-gradient(135deg, #f5e6d3 0%, #fef9f3 50%, #fffdf9 100%)'
      }}>
        <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
          <p className="text-gray-700 text-sm font-medium">Escolha a categoria desejada</p>
          <button
            onClick={() => setShowUrgencyTypeModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-xs transition-all shadow-md hover:shadow-lg whitespace-nowrap ${
              urgencyMode
                ? 'bg-red-600 text-white'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            <AlertCircle className={`w-4 h-4 ${urgencyMode ? 'animate-pulse' : ''}`} />
            {urgencyMode && urgencyType ? (
              urgencyType === 'message' ? 'Urg: Msg' :
              urgencyType === 'video' ? 'Urg: Vídeo' :
              'Urg: Dom'
            ) : 'Urgente'}
          </button>
        </div>

      <div className="px-4 py-2 space-y-4">
        <button
          onClick={handleMyCityClick}
          className="relative w-full h-32 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] group bg-gradient-to-r from-teal-500 to-teal-600"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 to-transparent group-hover:from-teal-700/30 transition-all duration-300"></div>

          <div className="relative h-full flex items-center justify-center gap-3 p-6">
            <MapPin className="w-10 h-10 text-white drop-shadow-lg" />
            <div className="text-left">
              <h3 className="font-bold text-white text-2xl mb-1 drop-shadow-lg">
                Minha Cidade
              </h3>
              <p className="text-white/95 text-sm font-medium drop-shadow">
                {userCity && userState ? `${userCity} - ${userState}` : 'Ver todos os profissionais da região'}
              </p>
            </div>
          </div>
        </button>

        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className="relative w-full h-40 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] group"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${category.image_url || getCategoryImage(category.name)})`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent group-hover:from-black/60 transition-all duration-300"></div>
            </div>

            <div className="relative h-full flex flex-col justify-end p-6">
              <h3 className="font-bold text-white text-2xl mb-2 drop-shadow-lg">
                {category.name}
              </h3>
              {category.description && (
                <p className="text-white/90 text-sm font-medium drop-shadow line-clamp-2">
                  {category.description}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

        {categories.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-600 text-lg font-medium">Nenhuma categoria disponível</p>
          </div>
        )}
      </div>

      {showLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Escolher Localização</h2>
              <button
                onClick={() => {
                  setShowLocationModal(false);
                  if (urgencyMode) {
                    setUrgencyMode(false);
                    setUrgencyType(null);
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {urgencyMode && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium mb-1">Atendimento Urgente Ativado</p>
                    <p>Selecione a cidade para encontrar profissionais com atendimento urgente de {
                      urgencyType === 'message' ? 'mensagem' :
                      urgencyType === 'video' ? 'vídeo' :
                      'domiciliar'
                    }.</p>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado / Região
                </label>
                <select
                  value={selectedFilterState}
                  onChange={(e) => {
                    setSelectedFilterState(e.target.value);
                    setSelectedFilterCity('');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                >
                  <option value="">Selecione um estado</option>
                  {availableStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              {selectedFilterState && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cidade / Município
                  </label>
                  <select
                    value={selectedFilterCity}
                    onChange={(e) => setSelectedFilterCity(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  >
                    <option value="">Selecione uma cidade</option>
                    {availableCities.map((city) => (
                      <option key={city.id} value={city.city}>
                        {city.city}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  onClick={handleApplyLocationFilter}
                  disabled={!selectedFilterState || !selectedFilterCity}
                  className="flex-1 bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ver Profissionais
                </button>
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Tipo de Urgência */}
      {showUrgencyTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Tipo de Urgência</h2>
              <button
                onClick={() => setShowUrgencyTypeModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-gray-600 text-sm mb-4">
                Selecione o tipo de atendimento urgente que você precisa:
              </p>

              <button
                onClick={() => {
                  setUrgencyMode(true);
                  setUrgencyType('message');
                  setSelectedCategory(null);
                  setShowUrgencyTypeModal(false);
                  if (!userCity || !userState) {
                    setSelectedFilterState('');
                    setSelectedFilterCity('');
                    setShowLocationModal(true);
                  } else {
                    setSelectedFilterState(userState);
                    setSelectedFilterCity(userCity);
                    setShowAllByCity(true);
                  }
                }}
                className={`w-full p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                  urgencyType === 'message'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">Urgência por Mensagem</p>
                    <p className="text-xs text-gray-500">Atendimento via chat</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setUrgencyMode(true);
                  setUrgencyType('video');
                  setSelectedCategory(null);
                  setShowUrgencyTypeModal(false);
                  if (!userCity || !userState) {
                    setSelectedFilterState('');
                    setSelectedFilterCity('');
                    setShowLocationModal(true);
                  } else {
                    setSelectedFilterState(userState);
                    setSelectedFilterCity(userCity);
                    setShowAllByCity(true);
                  }
                }}
                className={`w-full p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                  urgencyType === 'video'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Video className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">Urgência por Vídeo</p>
                    <p className="text-xs text-gray-500">Atendimento por videochamada</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setUrgencyMode(true);
                  setUrgencyType('home');
                  setSelectedCategory(null);
                  setShowUrgencyTypeModal(false);
                  if (!userCity || !userState) {
                    setSelectedFilterState('');
                    setSelectedFilterCity('');
                    setShowLocationModal(true);
                  } else {
                    setSelectedFilterState(userState);
                    setSelectedFilterCity(userCity);
                    setShowAllByCity(true);
                  }
                }}
                className={`w-full p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                  urgencyType === 'home'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Home className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">Urgência Domiciliar</p>
                    <p className="text-xs text-gray-500">Atendimento no local</p>
                  </div>
                </div>
              </button>

              {urgencyMode && (
                <button
                  onClick={() => {
                    setUrgencyMode(false);
                    setUrgencyType(null);
                    setShowAllByCity(false);
                    setShowUrgencyTypeModal(false);
                  }}
                  className="w-full mt-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
                >
                  Desativar Urgência
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
