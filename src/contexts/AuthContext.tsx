import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, User } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    birthDate: string,
    cpf: string,
    cep: string,
    city: string,
    address: string
  ) => Promise<{ error: string | null }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { user: loggedUser, error } = await authService.login(email, password);
    if (loggedUser) {
      setUser(loggedUser);
    }
    return { error };
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    birthDate: string,
    cpf: string,
    cep: string,
    city: string,
    address: string
  ) => {
    const { user: registeredUser, error } = await authService.register(
      email,
      password,
      fullName,
      phone,
      birthDate,
      cpf,
      cep,
      city,
      address
    );
    if (registeredUser) {
      setUser(registeredUser);
    }
    return { error };
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
