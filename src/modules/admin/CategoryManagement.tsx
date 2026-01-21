import React, { useState, useEffect } from 'react';
import { Plus, Folder, Edit, Trash2, Upload, X, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationPopup } from '../../components/NotificationPopup';

interface Category {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  is_visible: boolean;
  created_at: string;
}

export function CategoryManagement() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Erro ao carregar categorias:', error);
      setNotificationMessage('Erro ao carregar categorias: ' + error.message);
      setShowNotification(true);
      return;
    }

    if (data) {
      setCategories(data);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return formData.imageUrl || null;

    setUploading(true);
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('category-images')
      .upload(filePath, imageFile);

    setUploading(false);

    if (uploadError) {
      console.error('Erro ao fazer upload:', uploadError);
      setNotificationMessage('Erro ao fazer upload da imagem: ' + uploadError.message);
      setShowNotification(true);
      return null;
    }

    const { data } = supabase.storage
      .from('category-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const uploadedImageUrl = await uploadImage();
    if (imageFile && !uploadedImageUrl) return;

    if (editingId) {
      const { error } = await supabase
        .from('categories')
        .update({
          name: formData.name,
          description: formData.description,
          image_url: uploadedImageUrl,
        })
        .eq('id', editingId);

      if (error) {
        console.error('Erro ao atualizar categoria:', error);
        setNotificationMessage('Erro ao atualizar categoria: ' + error.message);
        setShowNotification(true);
        return;
      }
    } else {
      const { error } = await supabase
        .from('categories')
        .insert([{
          name: formData.name,
          description: formData.description,
          image_url: uploadedImageUrl,
          created_by: user?.id
        }]);

      if (error) {
        console.error('Erro ao criar categoria:', error);
        setNotificationMessage('Erro ao criar categoria: ' + error.message);
        setShowNotification(true);
        return;
      }
    }

    setFormData({ name: '', description: '', imageUrl: '' });
    setImageFile(null);
    setImagePreview('');
    setEditingId(null);
    setShowForm(false);
    loadCategories();
  };

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      description: category.description,
      imageUrl: category.image_url || '',
    });
    setImagePreview(category.image_url || '');
    setEditingId(category.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir esta categoria?')) {
      await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      loadCategories();
    }
  };

  const toggleVisibility = async (id: string, currentVisibility: boolean) => {
    const { error } = await supabase
      .from('categories')
      .update({ is_visible: !currentVisibility })
      .eq('id', id);

    if (error) {
      console.error('Erro ao alterar visibilidade:', error);
      setNotificationMessage('Erro ao alterar visibilidade: ' + error.message);
      setShowNotification(true);
      return;
    }

    loadCategories();
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData({ ...formData, imageUrl: '' });
  };

  if (showForm) {
    return (
      <div className="p-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {editingId ? 'Editar Categoria' : 'Nova Categoria'}
          </h2>
          <button
            onClick={() => {
              setShowForm(false);
              setEditingId(null);
              setFormData({ name: '', description: '', imageUrl: '' });
              setImageFile(null);
              setImagePreview('');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-gray-600 hover:text-gray-800"
          >
            Voltar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Categoria
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              placeholder="Ex: Fisioterapeutas"
              required
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
              rows={4}
              placeholder="Descreva o tipo de profissional desta categoria"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imagem da Categoria
            </label>

            {imagePreview ? (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-gray-200">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-teal-500 transition">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Clique para fazer upload</span>
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG ou WEBP (MAX. 5MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageSelect}
                />
              </label>
            )}
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Fazendo upload...' : editingId ? 'Salvar Alterações' : 'Criar Categoria'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Categorias</h2>
        <button
          onClick={() => {
            setShowForm(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="bg-teal-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-teal-600 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nova
        </button>
      </div>

      <div className="space-y-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
          >
            <div className="flex items-start gap-3">
              {category.image_url ? (
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={category.image_url}
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="bg-teal-100 p-3 rounded-lg">
                  <Folder className="w-6 h-6 text-teal-600" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-800">{category.name}</h3>
                  {!category.is_visible && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                      Oculta
                    </span>
                  )}
                </div>
                {category.description && (
                  <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleVisibility(category.id, category.is_visible)}
                  className={`p-2 hover:bg-gray-100 rounded-lg transition ${
                    category.is_visible ? 'text-green-600' : 'text-gray-400'
                  }`}
                  title={category.is_visible ? 'Ocultar categoria' : 'Mostrar categoria'}
                >
                  {category.is_visible ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleEdit(category)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12">
          <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Nenhuma categoria cadastrada</p>
        </div>
      )}

      <NotificationPopup
        isOpen={showNotification}
        message={notificationMessage}
        onClose={() => setShowNotification(false)}
      />
    </div>
  );
}
