import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function PaymentSettings() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  useEffect(() => {
    checkConnection();
  }, [user]);

  const checkConnection = async () => {
    if (!user) return;

    try {
      const { data: professional } = await supabase
        .from('professionals')
        .select('id, mercadopago_connected')
        .eq('user_id', user.id)
        .maybeSingle();

      if (professional) {
        setProfessionalId(professional.id);
        setIsConnected(professional.mercadopago_connected || false);

        if (professional.mercadopago_connected) {
          const { data: token } = await supabase
            .from('mercadopago_oauth_tokens')
            .select('*')
            .eq('professional_id', professional.id)
            .eq('is_active', true)
            .maybeSingle();

          setTokenInfo(token);
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!professionalId) {
      alert('Erro ao obter dados do profissional');
      return;
    }

    setConnecting(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-oauth-init`;
      const response = await fetch(`${apiUrl}?professional_id=${professionalId}`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      const data = await response.json();

      if (data.authorizationUrl) {
        window.open(data.authorizationUrl, '_blank', 'width=600,height=700');

        const checkInterval = setInterval(async () => {
          await checkConnection();
          const { data: professional } = await supabase
            .from('professionals')
            .select('mercadopago_connected')
            .eq('id', professionalId)
            .maybeSingle();

          if (professional?.mercadopago_connected) {
            clearInterval(checkInterval);
            setConnecting(false);
          }
        }, 2000);

        setTimeout(() => {
          clearInterval(checkInterval);
          setConnecting(false);
        }, 120000);
      }
    } catch (error) {
      console.error('Error connecting to Mercado Pago:', error);
      alert('Erro ao conectar com Mercado Pago');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!professionalId) return;

    const confirmDisconnect = confirm('Deseja realmente desconectar sua conta Mercado Pago?');
    if (!confirmDisconnect) return;

    try {
      await supabase
        .from('mercadopago_oauth_tokens')
        .update({ is_active: false })
        .eq('professional_id', professionalId);

      await supabase
        .from('professionals')
        .update({ mercadopago_connected: false })
        .eq('id', professionalId);

      setIsConnected(false);
      setTokenInfo(null);
      alert('Conta desconectada com sucesso');
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Erro ao desconectar conta');
    }
  };

  const handleRefreshToken = async () => {
    if (!professionalId) return;

    setConnecting(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-refresh-token`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ professionalId }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Token renovado com sucesso!');
        await checkConnection();
      } else {
        alert('Erro ao renovar token: ' + data.error);
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      alert('Erro ao renovar token');
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 pb-20">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Configurações de Pagamento
      </h2>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800">Mercado Pago</h3>
            <p className="text-sm text-gray-600">
              Conecte sua conta para receber pagamentos
            </p>
          </div>
          {isConnected ? (
            <CheckCircle className="w-6 h-6 text-green-500" />
          ) : (
            <AlertCircle className="w-6 h-6 text-orange-500" />
          )}
        </div>

        {!isConnected ? (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900 mb-1">
                  Conta não conectada
                </p>
                <p className="text-xs text-orange-700">
                  Conecte sua conta Mercado Pago para começar a receber pagamentos dos seus clientes.
                  Os pagamentos serão divididos automaticamente com a plataforma.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900 mb-1">
                  Conta conectada com sucesso!
                </p>
                <p className="text-xs text-green-700 mb-2">
                  Você já pode receber pagamentos através da plataforma.
                </p>
                {tokenInfo && (
                  <div className="text-xs text-green-700 space-y-1">
                    <p>ID do Usuário: {tokenInfo.user_id}</p>
                    <p>Token expira em: {new Date(tokenInfo.expires_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {connecting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Aguardando autorização...
                </>
              ) : (
                <>
                  <ExternalLink className="w-5 h-5" />
                  Conectar com Mercado Pago
                </>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={handleRefreshToken}
                disabled={connecting}
                className="w-full bg-teal-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-600 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${connecting ? 'animate-spin' : ''}`} />
                Renovar Token
              </button>
              <button
                onClick={handleDisconnect}
                className="w-full bg-red-50 text-red-600 px-6 py-3 rounded-lg font-medium hover:bg-red-100 transition-all flex items-center justify-center gap-2"
              >
                Desconectar Conta
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Como funciona?</h4>
        <ul className="text-sm text-blue-800 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>Conecte sua conta Mercado Pago com segurança através do OAuth</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>Quando aceitar um chamado, um link de pagamento será gerado automaticamente</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>A plataforma recebe sua comissão e você recebe o restante direto na sua conta</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>Todo o processo é automático e seguro</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
