import React, { useState, useEffect } from 'react';
import { DollarSign, Clock, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_type: string;
  hours?: number;
  days?: number;
  periods?: string[];
  locations?: string[];
}

export function PlansView() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('plans')
      .select('*')
      .order('price');

    if (data) {
      setPlans(data);
    }
    setLoading(false);
  };

  const formatDuration = (plan: Plan) => {
    if (plan.duration_type === 'hourly' && plan.hours) {
      return `${plan.hours}h`;
    } else if (plan.duration_type === 'daily' && plan.days) {
      return `${plan.days} ${plan.days === 1 ? 'dia' : 'dias'}`;
    } else if (plan.duration_type === 'period' && plan.periods && plan.periods.length > 0) {
      return plan.periods.join(', ');
    }
    return 'Personalizado';
  };

  if (loading) {
    return (
      <div className="p-4 pb-20">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Planos Disponíveis</h2>
        <div className="text-center py-8">
          <p className="text-gray-500">Carregando planos...</p>
        </div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="p-4 pb-20">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Planos Disponíveis</h2>
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum plano disponível no momento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Planos Disponíveis</h2>

      <div className="space-y-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-600">{plan.description}</p>
              </div>
              <div className="bg-teal-50 px-4 py-2 rounded-lg">
                <p className="text-2xl font-bold text-teal-600">
                  R$ {plan.price.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                {plan.duration_type === 'hourly' ? (
                  <Clock className="w-4 h-4 text-gray-600" />
                ) : (
                  <Calendar className="w-4 h-4 text-gray-600" />
                )}
                <span className="text-sm text-gray-700 font-medium">
                  {formatDuration(plan)}
                </span>
              </div>

              {plan.locations && plan.locations.length > 0 && (
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                  <span className="text-sm text-gray-700">
                    {plan.locations.join(', ')}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Este plano pode ser selecionado ao solicitar um serviço de um profissional
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
