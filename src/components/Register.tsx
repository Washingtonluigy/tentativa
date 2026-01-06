import React, { useState } from 'react';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface RegisterProps {
  onLoginClick: () => void;
}

export function Register({ onLoginClick }: RegisterProps) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    birthDate: '',
    cpf: '',
    cep: '',
    state: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    securityQuestion1: '',
    securityAnswer1: '',
    securityQuestion2: '',
    securityAnswer2: '',
    securityQuestion3: '',
    securityAnswer3: '',
  });

  const securityQuestions = [
    'Qual o nome do seu primeiro animal de estimação?',
    'Qual o nome de solteira da sua mãe?',
    'Em qual cidade você nasceu?',
    'Qual o nome da sua escola primária?',
    'Qual sua comida favorita?',
    'Qual o nome do seu primeiro professor?',
    'Qual sua cor favorita?',
    'Qual o modelo do seu primeiro carro?'
  ];
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (!acceptedTerms) {
      setError('Você deve aceitar os termos e condições');
      return;
    }

    if (!formData.securityQuestion1 || !formData.securityAnswer1 ||
        !formData.securityQuestion2 || !formData.securityAnswer2 ||
        !formData.securityQuestion3 || !formData.securityAnswer3) {
      setError('Você deve responder todas as perguntas de segurança');
      return;
    }

    if (formData.securityQuestion1 === formData.securityQuestion2 ||
        formData.securityQuestion1 === formData.securityQuestion3 ||
        formData.securityQuestion2 === formData.securityQuestion3) {
      setError('Você deve escolher perguntas diferentes');
      return;
    }

    setLoading(true);

    const { error: registerError } = await register(
      formData.email,
      formData.password,
      formData.fullName,
      formData.phone,
      formData.birthDate,
      formData.cpf,
      formData.cep,
      formData.state,
      formData.city,
      formData.address,
      formData.securityQuestion1,
      formData.securityAnswer1,
      formData.securityQuestion2,
      formData.securityAnswer2,
      formData.securityQuestion3,
      formData.securityAnswer3
    );

    if (registerError) {
      setError(registerError);
    }

    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-purple-100 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-10 my-8">
        <div className="flex justify-center mb-8">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-2xl shadow-lg">
            <UserPlus className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-center text-gray-800 mb-3 tracking-tight">
          Criar Conta
        </h1>
        <p className="text-center text-gray-500 mb-8 text-base">
          Preencha os dados para se cadastrar
        </p>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-5 py-4 rounded-lg mb-6 shadow-sm">
            <p className="font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nome Completo
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Data de Nascimento
            </label>
            <input
              type="date"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
              className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              CPF
            </label>
            <input
              type="text"
              name="cpf"
              value={formData.cpf}
              onChange={handleChange}
              className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              placeholder="000.000.000-00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              CEP
            </label>
            <input
              type="text"
              name="cep"
              value={formData.cep}
              onChange={handleChange}
              className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              placeholder="00000-000"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Estado
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                placeholder="Ex: Mato Grosso"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cidade
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                placeholder="Ex: Cuiabá"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Endereço
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              placeholder="Rua, Número, Bairro"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Número de Telefone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              placeholder="(00) 00000-0000"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              E-mail
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 pr-12 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Confirmar Senha
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 pr-12 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-6 border-t-2 border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Perguntas de Segurança
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Escolha 3 perguntas diferentes para recuperar sua senha caso necessário
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pergunta 1
                </label>
                <select
                  name="securityQuestion1"
                  value={formData.securityQuestion1}
                  onChange={handleChange}
                  className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  required
                >
                  <option value="">Selecione uma pergunta</option>
                  {securityQuestions.map((question, index) => (
                    <option key={index} value={question}>{question}</option>
                  ))}
                </select>
                <input
                  type="text"
                  name="securityAnswer1"
                  value={formData.securityAnswer1}
                  onChange={handleChange}
                  placeholder="Sua resposta"
                  className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all mt-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pergunta 2
                </label>
                <select
                  name="securityQuestion2"
                  value={formData.securityQuestion2}
                  onChange={handleChange}
                  className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  required
                >
                  <option value="">Selecione uma pergunta</option>
                  {securityQuestions.map((question, index) => (
                    <option key={index} value={question}>{question}</option>
                  ))}
                </select>
                <input
                  type="text"
                  name="securityAnswer2"
                  value={formData.securityAnswer2}
                  onChange={handleChange}
                  placeholder="Sua resposta"
                  className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all mt-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pergunta 3
                </label>
                <select
                  name="securityQuestion3"
                  value={formData.securityQuestion3}
                  onChange={handleChange}
                  className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  required
                >
                  <option value="">Selecione uma pergunta</option>
                  {securityQuestions.map((question, index) => (
                    <option key={index} value={question}>{question}</option>
                  ))}
                </select>
                <input
                  type="text"
                  name="securityAnswer3"
                  value={formData.securityAnswer3}
                  onChange={handleChange}
                  placeholder="Sua resposta"
                  className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all mt-2"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex items-start pt-3">
            <input
              type="checkbox"
              id="terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 mr-3 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
              Eu aceito os termos e condições de uso da plataforma
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 rounded-xl font-semibold text-base hover:from-purple-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-98"
          >
            {loading ? 'Criando conta...' : 'Criar Conta'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-base">
            Já tem uma conta?{' '}
            <button
              onClick={onLoginClick}
              className="text-purple-600 font-bold hover:text-purple-700 transition-colors underline-offset-4 hover:underline"
            >
              Fazer login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
