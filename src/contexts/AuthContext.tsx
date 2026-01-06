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
    state: string,
    city: string,
    address: string,
    securityQuestion1: string,
    securityAnswer1: string,
    securityQuestion2: string,
    securityAnswer2: string,
    securityQuestion3: string,
    securityAnswer3: string
  ) => Promise<{ error: string | null }>;
  logout: () => void;
  loading: boolean;
  getSecurityQuestions: (email: string) => Promise<{ questions: string[] | null; error: string | null }>;
  resetPassword: (
    email: string,
    securityAnswers: { answer1: string; answer2: string; answer3: string },
    newPassword: string
  ) => Promise<{ success: boolean; error: string | null }>;
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
    state: string,
    city: string,
    address: string,
    securityQuestion1: string,
    securityAnswer1: string,
    securityQuestion2: string,
    securityAnswer2: string,
    securityQuestion3: string,
    securityAnswer3: string
  ) => {
    const { user: registeredUser, error } = await authService.register(
      email,
      password,
      fullName,
      phone,
      birthDate,
      cpf,
      cep,
      state,
      city,
      address,
      securityQuestion1,
      securityAnswer1,
      securityQuestion2,
      securityAnswer2,
      securityQuestion3,
      securityAnswer3
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

  const getSecurityQuestions = async (email: string) => {
    return await authService.getSecurityQuestions(email);
  };

  const resetPassword = async (
    email: string,
    securityAnswers: { answer1: string; answer2: string; answer3: string },
    newPassword: string
  ) => {
    return await authService.resetPassword(email, securityAnswers, newPassword);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, getSecurityQuestions, resetPassword }}>
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
