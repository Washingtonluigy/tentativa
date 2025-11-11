import React, { useEffect, useState } from 'react';
import { CheckCircle, Calendar, Bell, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function ProfessionalDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    completed: 0,
    pending: 0,
    today: 0,
    total: 0,
  });

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    const [completedRes, pendingRes, appointmentsRes] = await Promise.all([
      supabase
        .from('service_requests')
        .select('id', { count: 'exact', head: true })
        .eq('professional_id', user.id)
        .eq('status', 'completed'),
      supabase
        .from('service_requests')
        .select('id', { count: 'exact', head: true })
        .eq('professional_id', user.id)
        .eq('status', 'pending'),
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('professional_id', user.id),
    ]);

    setStats({
      completed: completedRes.count || 0,
      pending: pendingRes.count || 0,
      today: 0,
      total: appointmentsRes.count || 0,
    });
  };

  const statCards = [
    {
      icon: CheckCircle,
      label: 'Atendimentos Concluídos',
      value: stats.completed,
      color: 'bg-green-500',
    },
    {
      icon: Bell,
      label: 'Chamados Pendentes',
      value: stats.pending,
      color: 'bg-orange-500',
    },
    {
      icon: Calendar,
      label: 'Agendados Hoje',
      value: stats.today,
      color: 'bg-blue-500',
    },
    {
      icon: TrendingUp,
      label: 'Total de Atendimentos',
      value: stats.total,
      color: 'bg-teal-500',
    },
  ];

  return (
    <div className="p-4 pb-20">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Meu Dashboard
      </h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
            >
              <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-4">
        <h3 className="font-semibold text-gray-800 mb-3">Status Atual</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Disponibilidade</span>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              Online
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Avaliação Média</span>
            <span className="font-semibold text-teal-500">4.8 ⭐</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Taxa de Resposta</span>
            <span className="font-semibold text-teal-500">95%</span>
          </div>
        </div>
      </div>

      {stats.pending > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-orange-600" />
            <div>
              <p className="font-semibold text-orange-900">
                Você tem {stats.pending} chamado{stats.pending > 1 ? 's' : ''} pendente{stats.pending > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-orange-700">
                Verifique a seção de chamados
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
