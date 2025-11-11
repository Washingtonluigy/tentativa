import React, { useEffect, useState } from 'react';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import logo from '../assets/Design sem nome (1).png';

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { logout, user } = useAuth();
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const loadUserName = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.full_name) {
          setUserName(data.full_name);
        }
      }
    };

    loadUserName();
  }, [user?.id]);

  const isAdmin = user?.role === 'admin';
  const headerClass = isAdmin
    ? 'bg-gradient-to-r from-purple-700 to-purple-600'
    : 'bg-gradient-to-r from-amber-100 to-amber-50';
  const textColor = isAdmin ? 'text-white' : 'text-gray-700';

  return (
    <div className={`px-6 py-4 flex items-center justify-between sticky top-0 z-10 ${headerClass}`}>
      <div className="flex items-center gap-3 mt-2">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className={`p-2 hover:bg-white/20 rounded-xl transition-all duration-200 active:scale-95 ${isAdmin ? 'hover:bg-white/20' : 'hover:bg-gray-200/50'}`}
          >
            <Menu className={`w-5 h-5 ${isAdmin ? 'text-white' : 'text-gray-700'}`} strokeWidth={2.5} />
          </button>
        )}
        <h1 className={`text-xs font-semibold tracking-tight ${textColor}`}>{userName || title}</h1>
      </div>

      <div className="absolute left-1/2 transform -translate-x-1/2">
        <img src={logo} alt="AmaH" className="h-20 w-auto" />
      </div>

      <button
        onClick={logout}
        className={`p-2.5 hover:bg-red-500/20 rounded-xl transition-all duration-200 ${isAdmin ? 'text-white hover:bg-white/20' : 'text-gray-700 hover:bg-gray-200/50'} active:scale-95`}
        title="Sair"
      >
        <LogOut className="w-5 h-5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
