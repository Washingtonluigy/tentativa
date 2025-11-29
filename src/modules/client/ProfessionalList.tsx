import React, { useState, useEffect } from 'react';
import { Search, User, Star, ArrowLeft, Clock, Calendar, AlertCircle, MapPin } from 'lucide-react';
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
  availability_status: 'available' | 'busy' | 'no_schedule';
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
  const [userCity, setUserCity] = useState<string>('');
  const [userState, setUserState] = useState<string>('');

  useEffect(() => {
    loadCategories();
    loadUserLocation();
  }, []);

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
  }, [selectedCategory]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (data) {
      setCategories(data);
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

    // Buscar informações do profissional incluindo horário flexível
    const { data: professionalData } = await supabase
      .from('professionals')
      .select('flexible_schedule_enabled, flexible_start_time, flexible_end_time')
      .eq('id', professionalId)
      .maybeSingle();

    // Verificar horário flexível primeiro
    if (professionalData?.flexible_schedule_enabled) {
      const flexStart = professionalData.flexible_start_time || '08:00:00';
      const flexEnd = professionalData.flexible_end_time || '18:00:00';

      // Normalizar formatos de tempo para comparação (HH:MM)
      const currentTimeNormalized = currentTime.slice(0, 5);
      const flexStartNormalized = flexStart.slice(0, 5);
      const flexEndNormalized = flexEnd.slice(0, 5);

      if (currentTimeNormalized >= flexStartNormalized && currentTimeNormalized <= flexEndNormalized) {
        return { status: 'available' as const };
      }
    }

    // Verificar horários específicos
    const { data: availabilityData } = await supabase
      .from('professional_availability')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('is_active', true);

    if (availabilityData && availabilityData.length > 0) {
      const todayAvailability = availabilityData.find(
        (slot: any) => slot.day_of_week === todayDayOfWeek &&
        slot.start_time <= currentTime &&
        slot.end_time >= currentTime
      );

      if (todayAvailability) {
        return { status: 'available' as const };
      }
    }

    return { status: 'no_schedule' as const };
  };

  const loadProfessionals = async (categoryId: string) => {
    const { data: profData, error } = await supabase
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

  const loadAllProfessionalsByCity = async () => {
    if (!userCity || !userState) return;

    const profsByCategory: ProfessionalsByCategory[] = [];

    for (const category of categories) {
      const { data: profData, error } = await supabase
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

      if (!profData) continue;

      const filteredByCity = profData.filter((p: any) =>
        p.users?.city === userCity && p.users?.state === userState
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

  const handleMyCityClick = async () => {
    setShowAllByCity(true);
    await loadAllProfessionalsByCity();
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

    if (urgencyMode) {
      filteredBySearch = filteredBySearch.map(cat => ({
        ...cat,
        professionals: cat.professionals.filter(p => p.availability_status === 'available')
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
            onClick={() => setUrgencyMode(!urgencyMode)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              urgencyMode
                ? 'bg-red-500 text-white shadow-lg'
                : 'bg-white text-red-500 border-2 border-red-500 hover:bg-red-50'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Urgência
          </button>
        </div>

        {userCity && userState && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Profissionais de: {userCity} - {userState}
              </p>
            </div>
          </div>
        )}

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
              Não há profissionais cadastrados em <strong>{userCity} - {userState}</strong>
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
                          <div className="flex items-center gap-2 text-amber-600 text-sm font-medium">
                            <Calendar className="w-4 h-4" />
                            <span>Indisponível no momento</span>
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

    if (urgencyMode) {
      filteredProfessionals = filteredProfessionals.filter(p => p.availability_status === 'available');
    }

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
            onClick={() => setUrgencyMode(!urgencyMode)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              urgencyMode
                ? 'bg-red-500 text-white shadow-lg'
                : 'bg-white text-red-500 border-2 border-red-500 hover:bg-red-50'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Urgência
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
              ) : professional.availability_status === 'busy' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-orange-600 text-sm font-medium bg-orange-50 px-3 py-2 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span>Em atendimento - Aguarde</span>
                  </div>
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-500 py-3 rounded-lg font-semibold cursor-not-allowed"
                  >
                    Indisponível
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-600 text-sm font-medium bg-red-50 px-3 py-2 rounded-lg">
                    <Calendar className="w-4 h-4" />
                    <span>Agenda lotada - Aguarde</span>
                  </div>
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-500 py-3 rounded-lg font-semibold cursor-not-allowed"
                  >
                    Indisponível
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
    <div className="min-h-screen pb-20" style={{
      background: 'linear-gradient(135deg, #f5e6d3 0%, #fef9f3 50%, #fffdf9 100%)'
    }}>
      <div className="px-4 pt-4 pb-2">
        <p className="text-gray-700 text-sm font-medium">Escolha a categoria desejada</p>
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
  );
}
