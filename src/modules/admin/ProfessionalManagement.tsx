import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Upload, X, User, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { NotificationPopup } from '../../components/NotificationPopup';

interface Category {
  id: string;
  name: string;
}

interface RegionalPrice {
  id: string;
  state: string;
  city: string | null;
  minimum_price: number;
}

interface City {
  id: string;
  state: string;
  city: string;
}

interface Professional {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  category_name: string;
  category_id: string;
  experience_years: number;
  status: string;
  phone: string;
}

export function ProfessionalManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [regionalPrices, setRegionalPrices] = useState<RegionalPrice[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<City[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    categoryId: '',
    experienceYears: '',
    references: '',
    description: '',
    regionalPriceId: '',
    state: '',
    city: '',
  });

  useEffect(() => {
    loadProfessionals();
    loadCategories();
    loadRegionalPrices();
    loadStates();
  }, []);

  useEffect(() => {
    if (formData.state) {
      loadCitiesByState(formData.state);
    }
  }, [formData.state]);

  const loadProfessionals = async () => {
    const { data: profData, error } = await supabase
      .from('professionals')
      .select('*');

    if (error) {
      console.error('Erro ao carregar profissionais:', error);
      setNotificationMessage('Erro ao carregar profissionais: ' + error.message);
      setShowNotification(true);
      return;
    }

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
          .select('full_name, phone, photo_url')
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
          phone: profileData?.phone || '',
          category_name: categoryData?.name || 'Sem categoria',
          category_id: p.category_id,
          experience_years: p.experience_years,
          status: p.status,
        };
      })
    );

    setProfessionals(formatted);
  };

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');

    if (data) {
      setCategories(data);
    }
  };

  const loadRegionalPrices = async () => {
    const { data, error } = await supabase
      .from('regional_minimum_prices')
      .select('id, state, city, minimum_price')
      .eq('active', true)
      .order('state');

    if (data) {
      setRegionalPrices(data);
    }
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
      setAvailableCities(data);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setNotificationMessage('Por favor, selecione apenas arquivos de imagem');
        setShowNotification(true);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setNotificationMessage('A imagem deve ter no máximo 5MB');
        setShowNotification(true);
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;

    setUploading(true);
    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('professional-photos')
      .upload(filePath, photoFile);

    setUploading(false);

    if (uploadError) {
      console.error('Erro ao fazer upload:', uploadError);
      setNotificationMessage('Erro ao fazer upload da foto: ' + uploadError.message);
      setShowNotification(true);
      return null;
    }

    const { data } = supabase.storage
      .from('professional-photos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('=== INICIANDO CADASTRO ===');
    console.log('Dados do formulário:', formData);

    try {
      const photoUrl = await uploadPhoto();
      console.log('URL da foto:', photoUrl);

      if (editingId) {
        const professional = professionals.find(p => p.id === editingId);
        if (!professional) {
          setNotificationMessage('Profissional não encontrado');
          setShowNotification(true);
          return;
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.fullName,
            phone: formData.phone,
            ...(photoUrl && { photo_url: photoUrl })
          })
          .eq('user_id', professional.user_id);

        if (profileError) {
          console.error('Erro ao atualizar perfil:', profileError);
          setNotificationMessage('Erro ao atualizar perfil: ' + profileError.message);
          setShowNotification(true);
          return;
        }

        const selectedRegion = regionalPrices.find(r => r.id === formData.regionalPriceId);

        await supabase
          .from('users')
          .update({
            state: formData.state || selectedRegion?.state || null,
            city: formData.city || selectedRegion?.city || null,
            regional_price_id: formData.regionalPriceId || null
          })
          .eq('id', professional.user_id);

        const { error: profError } = await supabase
          .from('professionals')
          .update({
            category_id: formData.categoryId,
            experience_years: parseInt(formData.experienceYears),
            professional_references: formData.references,
            description: formData.description,
          })
          .eq('id', editingId);

        if (profError) {
          console.error('Erro ao atualizar profissional:', profError);
          setNotificationMessage('Erro ao atualizar profissional: ' + profError.message);
          setShowNotification(true);
          return;
        }

        setNotificationMessage('Profissional atualizado com sucesso!');
        setShowNotification(true);
      } else {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', formData.email)
          .maybeSingle();

        if (existingUser) {
          setNotificationMessage('Este email já está cadastrado no sistema');
          setShowNotification(true);
          return;
        }

        console.log('Criando usuário...');
        const selectedRegion = regionalPrices.find(r => r.id === formData.regionalPriceId);

        const { data: userData, error: userError } = await supabase
          .from('users')
          .insert([{
            email: formData.email,
            password_hash: formData.password,
            role: 'professional',
            state: formData.state || selectedRegion?.state || null,
            city: formData.city || selectedRegion?.city || null,
            regional_price_id: formData.regionalPriceId || null
          }])
          .select()
          .single();

        console.log('Resultado criação usuário:', { userData, userError });

        if (userError) {
          console.error('Erro ao criar usuário:', userError);
          if (userError.message.includes('duplicate key') || userError.message.includes('unique constraint')) {
            setNotificationMessage('Este email já está cadastrado no sistema');
          } else {
            setNotificationMessage('Erro ao criar usuário: ' + userError.message);
          }
          setShowNotification(true);
          return;
        }

        if (!userData) {
          setNotificationMessage('Erro ao criar usuário');
          setShowNotification(true);
          return;
        }

        console.log('Criando perfil...');
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            user_id: userData.id,
            full_name: formData.fullName,
            phone: formData.phone,
            photo_url: photoUrl
          }]);

        console.log('Resultado criação perfil:', { profileError });

        if (profileError) {
          console.error('Erro ao criar perfil:', profileError);
          setNotificationMessage('Erro ao criar perfil: ' + profileError.message);
          setShowNotification(true);
          return;
        }

        console.log('Criando profissional...');
        const { error: profError } = await supabase
          .from('professionals')
          .insert([{
            user_id: userData.id,
            category_id: formData.categoryId,
            experience_years: parseInt(formData.experienceYears),
            professional_references: formData.references,
            description: formData.description,
            status: 'active'
          }]);

        console.log('Resultado criação profissional:', { profError });

        if (profError) {
          console.error('Erro ao criar profissional:', profError);
          setNotificationMessage('Erro ao criar profissional: ' + profError.message);
          setShowNotification(true);
          return;
        }

        console.log('=== CADASTRO CONCLUÍDO COM SUCESSO ===');
        setNotificationMessage('Profissional cadastrado com sucesso!');
        setShowNotification(true);
      }

      await loadProfessionals();

      setFormData({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        categoryId: '',
        experienceYears: '',
        references: '',
        description: '',
        regionalPriceId: '',
        state: '',
        city: '',
      });
      setPhotoFile(null);
      setPhotoPreview('');
      setEditingId(null);
      setShowPassword(false);

      setTimeout(() => {
        setShowForm(false);
      }, 100);
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      setNotificationMessage('Erro ao salvar: ' + error.message);
      setShowNotification(true);
    }
  };

  const handleEdit = async (professional: Professional) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('photo_url')
      .eq('user_id', professional.user_id)
      .maybeSingle();
    const { data: profData } = await supabase
      .from('professionals')
      .select('professional_references, description')
      .eq('id', professional.id)
      .maybeSingle();
    const { data: userData } = await supabase
      .from('users')
      .select('regional_price_id, state, city')
      .eq('id', professional.user_id)
      .maybeSingle();

    setFormData({
      fullName: professional.full_name,
      email: professional.email,
      password: '',
      phone: professional.phone,
      categoryId: professional.category_id,
      experienceYears: professional.experience_years.toString(),
      references: profData?.professional_references || '',
      description: profData?.description || '',
      regionalPriceId: userData?.regional_price_id || '',
      state: userData?.state || '',
      city: userData?.city || '',
    });
    setPhotoPreview(profileData?.photo_url || '');
    setEditingId(professional.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir este profissional?')) {
      await supabase
        .from('professionals')
        .delete()
        .eq('id', id);

      loadProfessionals();
    }
  };

  const filteredProfessionals = professionals.filter(p =>
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showForm) {
    return (
      <div className="p-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {editingId ? 'Editar Profissional' : 'Cadastrar Profissional'}
          </h2>
          <button
            onClick={() => {
              setShowForm(false);
              setEditingId(null);
              setFormData({
                fullName: '',
                email: '',
                password: '',
                phone: '',
                categoryId: '',
                experienceYears: '',
                references: '',
                description: '',
                regionalPriceId: '',
                state: '',
                city: '',
              });
              setPhotoFile(null);
              setPhotoPreview('');
              setShowPassword(false);
            }}
            className="text-gray-600 hover:text-gray-800"
          >
            Voltar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto do Profissional
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Adicione uma foto do profissional para gerar mais confiança aos clientes
            </p>

            {photoPreview ? (
              <div className="relative w-full aspect-square max-w-md mx-auto rounded-lg overflow-hidden border-2 border-gray-200">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview('');
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full aspect-square max-w-md mx-auto border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-teal-500 transition">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                  <Upload className="w-8 h-8 text-gray-400 mb-3" />
                  <p className="mb-2 text-sm text-gray-500 text-center px-4">
                    <span className="font-semibold">Clique para adicionar foto</span>
                  </p>
                  <p className="text-xs text-gray-500 text-center px-4">Formato quadrado 1:1 (1080x1080px recomendado)</p>
                  <p className="text-xs text-gray-400 text-center px-4 mt-1">PNG, JPG ou WEBP (MAX. 5MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                />
              </label>
            )}
          </div>
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

          {!editingId && (
            <>
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
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

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
              Valor Mínimo por Região
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Selecione a região de preço mínimo (opcional - para definir limite de cobrança)
            </p>
            <select
              value={formData.regionalPriceId}
              onChange={(e) => setFormData({ ...formData, regionalPriceId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            >
              <option value="">Nenhum</option>
              {regionalPrices.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.state}{region.city ? ` - ${region.city}` : ''} (Mínimo: R$ {region.minimum_price.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado (Localização)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Selecione o estado onde o profissional atende
            </p>
            <select
              value={formData.state}
              onChange={(e) => {
                setFormData({ ...formData, state: e.target.value, city: '' });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              required
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
                Cidade (Localização)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Selecione a cidade onde o profissional atende
              </p>
              <select
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                required
              >
                <option value="">Selecione uma cidade</option>
                {availableCities.map((cityObj) => (
                  <option key={cityObj.id} value={cityObj.city}>
                    {cityObj.city}
                  </option>
                ))}
              </select>
            </div>
          )}

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
            disabled={uploading}
            className="w-full bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Fazendo upload...' : editingId ? 'Salvar Alterações' : 'Cadastrar Profissional'}
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
                <button
                  onClick={() => handleEdit(professional)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => handleDelete(professional.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <NotificationPopup
        isOpen={showNotification}
        message={notificationMessage}
        onClose={() => setShowNotification(false)}
      />
    </div>
  );
}
