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
        .eq('email', email);

      console.log('Resultado da query:', { data, error });

      if (error) {
        console.error('Erro ao buscar usuário:', error);
        return { user: null, error: 'Erro ao conectar com o banco de dados: ' + error.message };
      }

      if (!data || data.length === 0) {
        console.log('Usuário não encontrado');
        return { user: null, error: 'Credenciais inválidas' };
      }

      const matchedUser = data.find(u => u.password_hash === password);

      if (matchedUser) {
        const user: User = {
          id: matchedUser.id,
          email: matchedUser.email,
          role: matchedUser.role as 'admin' | 'professional' | 'client',
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
    address: string,
    securityQuestion1: string,
    securityAnswer1: string,
    securityQuestion2: string,
    securityAnswer2: string,
    securityQuestion3: string,
    securityAnswer3: string
  ): Promise<AuthResponse> {
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', email)
        .eq('role', 'client')
        .maybeSingle();

      if (existingUser) {
        return { user: null, error: 'Este email já está cadastrado como cliente' };
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([{
          email,
          password_hash: password,
          role: 'client',
          state,
          city,
          security_question_1: securityQuestion1,
          security_answer_1: securityAnswer1.toLowerCase().trim(),
          security_question_2: securityQuestion2,
          security_answer_2: securityAnswer2.toLowerCase().trim(),
          security_question_3: securityQuestion3,
          security_answer_3: securityAnswer3.toLowerCase().trim()
        }])
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

  async resetPassword(
    email: string,
    securityAnswers: { answer1: string; answer2: string; answer3: string },
    newPassword: string
  ): Promise<{ success: boolean; error: string | null; role?: string }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, role, security_question_1, security_answer_1, security_question_2, security_answer_2, security_question_3, security_answer_3')
        .eq('email', email);

      if (error || !data || data.length === 0) {
        return { success: false, error: 'Email não encontrado' };
      }

      for (const user of data) {
        const answer1Match = user.security_answer_1 === securityAnswers.answer1.toLowerCase().trim();
        const answer2Match = user.security_answer_2 === securityAnswers.answer2.toLowerCase().trim();
        const answer3Match = user.security_answer_3 === securityAnswers.answer3.toLowerCase().trim();

        const correctAnswers = [answer1Match, answer2Match, answer3Match].filter(Boolean).length;

        if (correctAnswers >= 2) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ password_hash: newPassword })
            .eq('id', user.id);

          if (updateError) {
            return { success: false, error: 'Erro ao atualizar senha' };
          }

          return { success: true, error: null, role: user.role };
        }
      }

      return { success: false, error: 'Respostas incorretas. Você precisa acertar pelo menos 2 de 3 perguntas' };
    } catch (error) {
      return { success: false, error: 'Erro ao redefinir senha' };
    }
  },

  async getSecurityQuestions(email: string): Promise<{ questions: string[] | null; error: string | null; hasMultipleAccounts?: boolean }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('security_question_1, security_question_2, security_question_3, role')
        .eq('email', email);

      if (error || !data || data.length === 0) {
        return { questions: null, error: 'Email não encontrado' };
      }

      return {
        questions: [
          data[0].security_question_1,
          data[0].security_question_2,
          data[0].security_question_3
        ],
        error: null,
        hasMultipleAccounts: data.length > 1
      };
    } catch (error) {
      return { questions: null, error: 'Erro ao buscar perguntas' };
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
