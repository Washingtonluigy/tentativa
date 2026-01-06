import React, { useState } from 'react';
import { KeyRound, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

export function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  const { getSecurityQuestions, resetPassword } = useAuth();
  const [step, setStep] = useState<'email' | 'questions' | 'newPassword' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState({ answer1: '', answer2: '', answer3: '' });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { questions: userQuestions, error: questionsError } = await getSecurityQuestions(email);

    if (questionsError || !userQuestions) {
      setError(questionsError || 'Email não encontrado');
      setLoading(false);
      return;
    }

    setQuestions(userQuestions);
    setStep('questions');
    setLoading(false);
  };

  const handleQuestionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStep('newPassword');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    const { success, error: resetError } = await resetPassword(email, answers, newPassword);

    if (!success) {
      setError(resetError || 'Erro ao redefinir senha');
      setLoading(false);
      return;
    }

    setStep('success');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-purple-100 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-10">
        <div className="flex justify-center mb-8">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-2xl shadow-lg">
            <KeyRound className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-center text-gray-800 mb-3 tracking-tight">
          Recuperar Senha
        </h1>
        <p className="text-center text-gray-500 mb-8 text-base">
          {step === 'email' && 'Informe seu email para recuperar a senha'}
          {step === 'questions' && 'Responda as perguntas de segurança'}
          {step === 'newPassword' && 'Defina sua nova senha'}
          {step === 'success' && 'Senha redefinida com sucesso!'}
        </p>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-5 py-4 rounded-lg mb-6 shadow-sm">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                placeholder="seu@email.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 rounded-xl font-semibold text-base hover:from-purple-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Carregando...' : 'Continuar'}
            </button>
          </form>
        )}

        {step === 'questions' && (
          <form onSubmit={handleQuestionsSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {questions[0]}
              </label>
              <input
                type="text"
                value={answers.answer1}
                onChange={(e) => setAnswers({ ...answers, answer1: e.target.value })}
                className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                placeholder="Sua resposta"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {questions[1]}
              </label>
              <input
                type="text"
                value={answers.answer2}
                onChange={(e) => setAnswers({ ...answers, answer2: e.target.value })}
                className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                placeholder="Sua resposta"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {questions[2]}
              </label>
              <input
                type="text"
                value={answers.answer3}
                onChange={(e) => setAnswers({ ...answers, answer3: e.target.value })}
                className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                placeholder="Sua resposta"
                required
              />
            </div>

            <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              Você precisa acertar pelo menos 2 de 3 perguntas
            </p>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 rounded-xl font-semibold text-base hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Continuar
            </button>
          </form>
        )}

        {step === 'newPassword' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nova Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  placeholder="Mínimo 6 caracteres"
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
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  placeholder="Confirme sua senha"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 rounded-xl font-semibold text-base hover:from-purple-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Redefinindo...' : 'Redefinir Senha'}
            </button>
          </form>
        )}

        {step === 'success' && (
          <div className="text-center space-y-6">
            <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-5 py-4 rounded-lg">
              <p className="font-medium">Sua senha foi redefinida com sucesso!</p>
            </div>

            <button
              onClick={onBackToLogin}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 rounded-xl font-semibold text-base hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Voltar para Login
            </button>
          </div>
        )}

        {step !== 'success' && (
          <div className="mt-6 text-center">
            <button
              onClick={onBackToLogin}
              className="text-purple-600 font-bold hover:text-purple-700 transition-colors underline-offset-4 hover:underline inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
