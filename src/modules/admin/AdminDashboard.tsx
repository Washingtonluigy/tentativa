import React, { useEffect, useState } from 'react';
import { Users, Briefcase, CheckCircle, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function AdminDashboard() {
  const [stats, setStats] = useState({
    clients: 0,
    professionals: 0,
    appointments: 0,
    requests: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [clientsRes, professionalsRes, appointmentsRes, requestsRes] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'client'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'professional'),
      supabase.from('appointments').select('id', { count: 'exact', head: true }),
      supabase.from('service_requests').select('id', { count: 'exact', head: true }),
    ]);

    setStats({
      clients: clientsRes.count || 0,
      professionals: professionalsRes.count || 0,
      appointments: appointmentsRes.count || 0,
      requests: requestsRes.count || 0,
    });
  };

  const statCards = [
    {
      icon: Users,
      label: 'Clientes',
      value: stats.clients,
      color: 'bg-blue-500',
    },
    {
      icon: Briefcase,
      label: 'Profissionais',
      value: stats.professionals,
      color: 'bg-teal-500',
    },
    {
      icon: CheckCircle,
      label: 'Atendimentos',
      value: stats.appointments,
      color: 'bg-green-500',
    },
    {
      icon: TrendingUp,
      label: 'Chamados',
      value: stats.requests,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="p-4 pb-20">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Dashboard Administrativo
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

      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-3">Indicadores em Tempo Real</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Taxa de Conversão</span>
            <span className="font-semibold text-teal-500">85%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Satisfação Média</span>
            <span className="font-semibold text-teal-500">4.8/5.0</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Tempo Médio de Resposta</span>
            <span className="font-semibold text-teal-500">12 min</span>
          </div>
        </div>
      </div>
    </div>
  );
}
