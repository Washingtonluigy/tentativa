import { supabase } from './supabase';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'professional' | 'client';
}

export interface AuthResponse {
  user: User | null;
  error: string | null;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      console.log('Tentando login com:', email);

      const { data, error } = await supabase
        .from('users')
        .select('id, email, role, password_hash')
        .eq('email', email)
        .maybeSingle();

      console.log('Resultado da query:', { data, error });

      if (error) {
        console.error('Erro ao buscar usuário:', error);
        return { user: null, error: 'Erro ao conectar com o banco de dados: ' + error.message };
      }

      if (!data) {
        console.log('Usuário não encontrado');
        return { user: null, error: 'Credenciais inválidas' };
      }

      console.log('Senha informada:', password);
      console.log('Senha no banco:', data.password_hash);
      console.log('Senhas são iguais?', data.password_hash === password);

      if (data.password_hash === password) {
        const user: User = {
          id: data.id,
          email: data.email,
          role: data.role as 'admin' | 'professional' | 'client',
        };

        localStorage.setItem('currentUser', JSON.stringify(user));
        return { user, error: null };
      }

      return { user: null, error: 'Credenciais inválidas' };
    } catch (error) {
      console.error('Erro no catch:', error);
      return { user: null, error: 'Erro ao fazer login' };
    }
  },

  async register(
    email: string,
    password: string,
    fullName: string,
    phone: string,
    birthDate: string,
    cpf: string,
    cep: string,
    state: string,
    city: string,
    address: string
  ): Promise<AuthResponse> {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([{ email, password_hash: password, role: 'client', state, city }])
        .select()
        .single();

      if (userError) {
        return { user: null, error: 'Erro ao criar conta' };
      }

      await supabase
        .from('profiles')
        .insert([{
          user_id: userData.id,
          full_name: fullName,
          phone: phone,
          birth_date: birthDate,
          cpf: cpf,
          cep: cep,
          city: city,
          address: address
        }]);

      const user: User = {
        id: userData.id,
        email: userData.email,
        role: 'client',
      };

      localStorage.setItem('currentUser', JSON.stringify(user));
      return { user, error: null };
    } catch (error) {
      return { user: null, error: 'Erro ao criar conta' };
    }
  },

  logout() {
    localStorage.removeItem('currentUser');
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return null;
    return JSON.parse(userStr);
  },
};
