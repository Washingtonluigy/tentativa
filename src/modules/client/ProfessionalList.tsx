import React, { useState, useEffect } from 'react';
import { Search, User, Star, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Category {
  id: string;
  name: string;
  description: string;
}

interface Professional {
  id: string;
  user_id: string;
  full_name: string;
  description: string;
  experience_years: number;
  category_name: string;
  photo_url: string;
}

interface ProfessionalListProps {
  onRequestService: (professionalId: string, professionalName: string) => void;
}

export function ProfessionalList({ onRequestService }: ProfessionalListProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

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

  const loadProfessionals = async (categoryId: string) => {
    const { data: profData, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('category_id', categoryId)
      .eq('status', 'active');

    if (!profData) {
      console.error('Error loading professionals:', error);
      setProfessionals([]);
      return;
    }

    const formatted = await Promise.all(
      profData.map(async (p: any) => {
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

        return {
          id: p.id,
          user_id: p.user_id,
          full_name: profileData?.full_name || 'Profissional',
          description: p.description || 'Profissional qualificado',
          experience_years: p.experience_years || 0,
          category_name: categoryData?.name || '',
          photo_url: profileData?.photo_url || '',
        };
      })
    );

    setProfessionals(formatted);
  };

  if (selectedCategory && professionals.length >= 0) {
    const filteredProfessionals = professionals.filter(p =>
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="p-4 pb-20">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              setSelectedCategory(null);
              setProfessionals([]);
              setSearchTerm('');
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Profissionais</h2>
        </div>

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
                <div className="bg-teal-100 p-3 rounded-full">
                  <User className="w-8 h-8 text-teal-600" />
                </div>
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

              <button
                onClick={() => onRequestService(professional.user_id, professional.full_name)}
                className="w-full bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition"
              >
                Abrir Chamado
              </button>
            </div>
          ))}
        </div>

        {filteredProfessionals.length === 0 && (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum profissional encontrado</p>
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
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className="relative w-full h-40 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] group"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${getCategoryImage(category.name)})`,
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
