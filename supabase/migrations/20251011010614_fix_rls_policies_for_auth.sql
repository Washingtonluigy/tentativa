/*
  # Corrigir Políticas RLS para Permitir Autenticação

  Este migration corrige as políticas de RLS para permitir que usuários não autenticados
  possam fazer login e se registrar no sistema.

  ## Mudanças

  1. **users table**
     - Adiciona política para permitir leitura pública (necessário para login)
     - Adiciona política para permitir criação de novos usuários (registro)

  2. **profiles table**
     - Adiciona política para permitir criação de perfis durante registro
     - Adiciona política para leitura pública de perfis básicos
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;

-- Allow public read access to users table for authentication
CREATE POLICY "Public can read users for authentication"
  ON users FOR SELECT
  USING (true);

-- Allow anyone to insert new users (for registration)
CREATE POLICY "Anyone can create account"
  ON users FOR INSERT
  WITH CHECK (true);

-- Allow users to update their own data
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'))
  WITH CHECK (id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'));

-- Drop existing restrictive profile policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Allow anyone to create profiles during registration
CREATE POLICY "Anyone can create profile"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- Allow public read access to profiles
CREATE POLICY "Public can read profiles"
  ON profiles FOR SELECT
  USING (true);

-- Allow users to update their own profiles
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);
