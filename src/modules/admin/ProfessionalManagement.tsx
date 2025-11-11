import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Category {
  id: string;
  name: string;
}

interface Professional {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  category_name: string;
  experience_years: number;
  status: string;
}

export function ProfessionalManagement() {
  const [showForm, setShowForm] = useState(false);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    categoryId: '',
    experienceYears: '',
    references: '',
    description: '',
  });

  useEffect(() => {
    loadProfessionals();
    loadCategories();
  }, []);

  const loadProfessionals = async () => {
    const { data: profData } = await supabase
      .from('professionals')
      .select('*');

    if (!profData) return;

    const formatted = await Promise.all(
      profData.map(async (p: any) => {
        const { data: userData } = await supabase
          .from('users')
          .select('email')
          .eq('id', p.user_id)
          .maybeSingle();

        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
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
          email: userData?.email || 'N/A',
          full_name: profileData?.full_name || 'N/A',
          category_name: categoryData?.name || 'Sem categoria',
          experience_years: p.experience_years,
          status: p.status,
        };
      })
    );

    setProfessionals(formatted);
  };

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');

    if (data) {
      setCategories(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{
        email: formData.email,
        password_hash: formData.password,
        role: 'professional'
      }])
      .select()
      .single();

    if (userError || !userData) return;

    await supabase
      .from('profiles')
      .insert([{
        user_id: userData.id,
        full_name: formData.fullName,
        phone: formData.phone
      }]);

    await supabase
      .from('professionals')
      .insert([{
        user_id: userData.id,
        category_id: formData.categoryId,
        experience_years: parseInt(formData.experienceYears),
        professional_references: formData.references,
        description: formData.description,
        status: 'active'
      }]);

    setFormData({
      fullName: '',
      email: '',
      password: '',
      phone: '',
      categoryId: '',
      experienceYears: '',
      references: '',
      description: '',
    });
    setShowForm(false);
    loadProfessionals();
  };

  const filteredProfessionals = professionals.filter(p =>
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showForm) {
    return (
      <div className="p-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Cadastrar Profissional</h2>
          <button
            onClick={() => setShowForm(false)}
            className="text-gray-600 hover:text-gray-800"
          >
            Voltar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              required
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anos de Experiência
            </label>
            <input
              type="number"
              value={formData.experienceYears}
              onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Referências Profissionais
            </label>
            <textarea
              value={formData.references}
              onChange={(e) => setFormData({ ...formData, references: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              rows={3}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition"
          >
            Cadastrar Profissional
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Profissionais</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-teal-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-teal-600 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar profissionais..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
        />
      </div>

      <div className="space-y-3">
        {filteredProfessionals.map((professional) => (
          <div
            key={professional.id}
            className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-800">{professional.full_name}</h3>
                <p className="text-sm text-gray-600">{professional.email}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                professional.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {professional.status === 'active' ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="flex justify-between items-center mt-3">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{professional.category_name}</span>
                {' • '}
                <span>{professional.experience_years} anos</span>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-red-50 rounded-lg transition">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
