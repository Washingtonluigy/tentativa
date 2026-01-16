import React, { useEffect, useState } from 'react';
import { LogOut, Menu, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo_amah_(1).png';

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
  onNameClick?: () => void;
}

export function Header({ title, onMenuClick, onNameClick }: HeaderProps) {
  const { logout, user } = useAuth();
  const [userName, setUserName] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');

  useEffect(() => {
    const loadUserProfile = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, photo_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.full_name) {
          setUserName(data.full_name);
        }
        if (data?.photo_url) {
          setPhotoUrl(data.photo_url);
        }
      }
    };

    loadUserProfile();
  }, [user?.id]);

  const isAdmin = user?.role === 'admin';
  const headerClass = isAdmin
    ? 'bg-gradient-to-r from-purple-700 to-purple-600'
    : 'bg-gradient-to-r from-amber-100 to-amber-50';
  const textColor = isAdmin ? 'text-white' : 'text-gray-700';

  return (
    <div className={`px-6 py-4 flex items-center justify-between sticky top-0 z-10 ${headerClass}`}>
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className={`p-2 hover:bg-white/20 rounded-xl transition-all duration-200 active:scale-95 ${isAdmin ? 'hover:bg-white/20' : 'hover:bg-gray-200/50'}`}
          >
            <Menu className={`w-5 h-5 ${isAdmin ? 'text-white' : 'text-gray-700'}`} strokeWidth={2.5} />
          </button>
        )}
        {onNameClick ? (
          <button
            onClick={onNameClick}
            className="flex items-center gap-2 hover:opacity-80 transition"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${isAdmin ? 'bg-white/20' : 'bg-white'} border-2 ${isAdmin ? 'border-white/30' : 'border-gray-200'}`}>
              {photoUrl ? (
                <img src={photoUrl} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <User className={`w-5 h-5 ${isAdmin ? 'text-white' : 'text-gray-600'}`} />
              )}
            </div>
          </button>
        ) : (
          <h1 className={`text-xs font-semibold tracking-tight ${textColor}`}>{userName || title}</h1>
        )}
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
