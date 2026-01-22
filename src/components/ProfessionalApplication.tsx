import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Upload, X, User, MessageCircle, Phone } from 'lucide-react';

interface ProfessionalApplicationProps {
  onBack: () => void;
}

export default function ProfessionalApplication({ onBack }: ProfessionalApplicationProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    profession: '',
    registration_number: '',
    experience_years: '',
    state: '',
    city: '',
    professional_references: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    loadStates();
  }, []);

  useEffect(() => {
    if (formData.state) {
      loadCities(formData.state);
    } else {
      setCities([]);
    }
  }, [formData.state]);

  const loadStates = async () => {
    try {
      const { data, error } = await supabase
        .from('brazilian_cities')
        .select('state')
        .eq('active', true)
        .order('state');

      if (error) throw error;

      const uniqueStates = Array.from(new Set(data?.map(item => item.state) || []));
      setStates(uniqueStates);
    } catch (err) {
      console.error('Erro ao carregar estados:', err);
    }
  };

  const loadCities = async (state: string) => {
    setLoadingCities(true);
    setCities([]);
    setFormData(prev => ({ ...prev, city: '' }));

    try {
      const { data, error } = await supabase
        .from('brazilian_cities')
        .select('city')
        .eq('state', state)
        .eq('active', true)
        .order('city');

      if (error) throw error;

      setCities(data?.map(item => item.city) || []);
    } catch (err) {
      console.error('Erro ao carregar cidades:', err);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const resizeImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Não foi possível processar a imagem'));
            return;
          }

          const targetSize = 1080;
          canvas.width = targetSize;
          canvas.height = targetSize;

          console.log(`Canvas criado: ${canvas.width}x${canvas.height}`);
          console.log(`Imagem original: ${img.width}x${img.height}`);

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetSize, targetSize);

          const scale = Math.min(targetSize / img.width, targetSize / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const x = (targetSize - scaledWidth) / 2;
          const y = (targetSize - scaledHeight) / 2;

          console.log(`Escala: ${scale}`);
          console.log(`Imagem escalonada: ${scaledWidth}x${scaledHeight}`);
          console.log(`Posição: x=${x}, y=${y}`);

          ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

          canvas.toBlob((blob) => {
            if (blob) {
              console.log(`Blob criado, tamanho: ${blob.size} bytes`);
              const resizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              console.log(`Arquivo final criado: ${resizedFile.size} bytes`);
              resolve(resizedFile);
            } else {
              reject(new Error('Erro ao processar imagem'));
            }
          }, 'image/jpeg', 0.9);
        };
        img.onerror = () => reject(new Error('Erro ao carregar imagem'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione apenas arquivos de imagem');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('A imagem deve ter no máximo 5MB');
        return;
      }

      try {
        const resizedFile = await resizeImage(file);
        setPhotoFile(resizedFile);

        const reader = new FileReader();
        reader.onloadend = () => {
          const img = new Image();
          img.onload = () => {
            console.log(`Preview carregado - Dimensões: ${img.width}x${img.height}`);
            if (img.width === 1080 && img.height === 1080) {
              console.log('✓ Imagem redimensionada corretamente para 1080x1080!');
            } else {
              console.warn(`⚠ Atenção: Imagem está em ${img.width}x${img.height}, esperado 1080x1080`);
            }
          };
          img.src = reader.result as string;
          setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(resizedFile);
        setError('');
      } catch (err) {
        setError('Erro ao processar a imagem');
        console.error(err);
      }
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
      setError('Erro ao fazer upload da foto: ' + uploadError.message);
      return null;
    }

    const { data } = supabase.storage
      .from('professional-photos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!photoFile) {
      setError('Por favor, adicione uma foto sua para continuar');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const photoUrl = await uploadPhoto();
      if (!photoUrl) return;

      const { error: insertError } = await supabase
        .from('professional_applications')
        .insert([{
          full_name: formData.full_name,
          phone: formData.phone,
          email: formData.email,
          profession: formData.profession,
          registration_number: formData.registration_number,
          experience_years: parseInt(formData.experience_years),
          state: formData.state,
          city: formData.city,
          professional_references: formData.professional_references,
          photo_url: photoUrl,
          status: 'pending'
        }]);

      if (insertError) throw insertError;

      setSuccess(true);
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        profession: '',
        registration_number: '',
        experience_years: '',
        state: '',
        city: '',
        professional_references: ''
      });
      setPhotoFile(null);
      setPhotoPreview('');
    } catch (err) {
      console.error('Erro ao enviar solicitação:', err);
      setError('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8 max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Solicitação Enviada!</h2>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-left">
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
              Após o envio das informações, se aprovado, nossa equipe entrará em contato para passar mais informações
              <span className="font-semibold"> (acesso ao sistema admin)</span> e encaminhar os meios de pagamento da adesão.
            </p>
          </div>
          <button
            onClick={onBack}
            className="w-full bg-blue-600 text-white py-2.5 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base shadow-lg"
          >
            Voltar para Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-8 max-w-2xl w-full">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          <span className="text-sm sm:text-base">Voltar</span>
        </button>

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-5 rounded-xl mb-4 sm:mb-6 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base mb-1">Você Profissional!</h3>
              <p className="text-xs sm:text-sm leading-relaxed">
                Para utilização do app a fim de atender nossos clientes há uma <span className="font-bold">adesão de R$ 200,00</span> para acesso e gestão de clientes e serviços.
              </p>
            </div>
          </div>
        </div>

        <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">Seja um Profissional Parceiro</h2>
        <p className="text-xs sm:text-base text-gray-600 mb-4 sm:mb-6">
          Preencha o formulário abaixo e nossa equipe entrará em contato para avaliar sua candidatura.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg mb-3 sm:mb-4 text-xs sm:text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Telefone *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Profissão *
              </label>
              <input
                type="text"
                name="profession"
                value={formData.profession}
                onChange={handleChange}
                required
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Enfermeiro, Médico, Fisioterapeuta"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Número de Registro *
              </label>
              <input
                type="text"
                name="registration_number"
                value={formData.registration_number}
                onChange={handleChange}
                required
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: COREN 123456, CRM 78910"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Anos de Experiência *
              </label>
              <input
                type="number"
                name="experience_years"
                value={formData.experience_years}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Estado (Localização) *
              </label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Selecione o estado onde o profissional atende</option>
                {states.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Selecione o estado onde o profissional atende</p>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Cidade/Município *
              </label>
              <select
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                disabled={!formData.state || loadingCities}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!formData.state ? 'Selecione primeiro o estado' : loadingCities ? 'Carregando cidades...' : 'Selecione a cidade/município'}
                </option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              Foto Profissional *
            </label>
            <p className="text-[10px] sm:text-xs text-gray-500 mb-2 sm:mb-3">
              Adicione uma foto sua real. Isso gera mais segurança e confiança.
            </p>

            {photoPreview ? (
              <div className="relative w-full max-w-md mx-auto aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-white">
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
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                  1080x1080
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full max-w-md mx-auto aspect-square border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2 sm:mb-3">
                    <User className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                  </div>
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mb-2 sm:mb-3" />
                  <p className="mb-1 sm:mb-2 text-xs sm:text-sm text-gray-500">
                    <span className="font-semibold">Clique para adicionar sua foto</span>
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500">PNG, JPG ou WEBP (MAX. 5MB)</p>
                  <p className="text-[10px] sm:text-xs text-blue-600 font-medium mt-2">Formato: 1080x1080 (quadrado)</p>
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
              Referências Profissionais
            </label>
            <textarea
              name="professional_references"
              value={formData.professional_references}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Informe contatos de referências profissionais, locais onde trabalhou, etc."
            />
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <MessageCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800">
                  Informação Importante
                </p>
                <p className="mt-1 text-sm text-blue-700">
                  Para profissionais aprovados haverá uma taxa de adesão para expor seus serviços na plataforma - confira com nosso SAC
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || uploading}
            className="w-full bg-blue-600 text-white py-2.5 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {uploading ? 'Fazendo upload da foto...' : loading ? 'Enviando...' : 'Enviar Solicitação'}
          </button>
        </form>

        <a
          href="https://wa.me/5565999072070"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-all duration-300 hover:scale-110 z-50 flex items-center gap-2 group"
          title="Fale com nosso SAC pelo WhatsApp"
        >
          <Phone className="w-6 h-6" />
          <span className="hidden group-hover:inline-block text-sm font-medium whitespace-nowrap">
            Falar com SAC
          </span>
        </a>
      </div>
    </div>
  );
}
