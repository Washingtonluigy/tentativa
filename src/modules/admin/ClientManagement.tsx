import React, { useState, useEffect } from 'react';
import { Search, User, Lock, Ban } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Client {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  city: string;
  created_at: string;
}

export function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const { data: usersData } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'client')
      .order('created_at', { ascending: false });

    if (!usersData) return;

    const formatted = await Promise.all(
      usersData.map(async (user: any) => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, phone, city')
          .eq('user_id', user.id)
          .maybeSingle();

        return {
          id: user.id,
          email: user.email,
          full_name: profileData?.full_name || 'N/A',
          phone: profileData?.phone || '',
          city: profileData?.city || '',
          created_at: user.created_at,
        };
      })
    );

    setClients(formatted);
  };

  const filteredClients = clients.filter(c =>
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 pb-20">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Gerenciar Clientes</h2>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar clientes..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
        />
      </div>

      <div className="space-y-3">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="bg-blue-100 p-3 rounded-full">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{client.full_name}</h3>
                <p className="text-sm text-gray-600">{client.email}</p>
                {client.phone && (
                  <p className="text-sm text-gray-600">{client.phone}</p>
                )}
                {client.city && (
                  <p className="text-sm text-gray-500">{client.city}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-gray-100">
              <button className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                Resetar Senha
              </button>
              <button className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition flex items-center justify-center gap-2">
                <Ban className="w-4 h-4" />
                Bloquear
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Nenhum cliente encontrado</p>
        </div>
      )}
    </div>
  );
}
