/*
  # Permitir acesso anônimo às tabelas

  Como estamos usando autenticação customizada (não Supabase Auth),
  precisamos permitir acesso anônimo às operações do banco.

  ## Mudanças

  1. Remover políticas que requerem authenticated
  2. Criar políticas que permitam acesso anônimo (anon role)
*/

-- Categories
DROP POLICY IF EXISTS "Everyone can read categories" ON categories;
DROP POLICY IF EXISTS "Authenticated can insert categories" ON categories;
DROP POLICY IF EXISTS "Authenticated can update categories" ON categories;
DROP POLICY IF EXISTS "Authenticated can delete categories" ON categories;

CREATE POLICY "Anyone can read categories"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert categories"
  ON categories FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update categories"
  ON categories FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete categories"
  ON categories FOR DELETE
  TO anon, authenticated
  USING (true);

-- Professionals
DROP POLICY IF EXISTS "Everyone can read professionals" ON professionals;
DROP POLICY IF EXISTS "Authenticated can insert professionals" ON professionals;
DROP POLICY IF EXISTS "Authenticated can update professionals" ON professionals;
DROP POLICY IF EXISTS "Authenticated can delete professionals" ON professionals;

CREATE POLICY "Anyone can read professionals"
  ON professionals FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert professionals"
  ON professionals FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update professionals"
  ON professionals FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete professionals"
  ON professionals FOR DELETE
  TO anon, authenticated
  USING (true);

-- Plans
DROP POLICY IF EXISTS "Everyone can read plans" ON plans;
DROP POLICY IF EXISTS "Authenticated can insert plans" ON plans;
DROP POLICY IF EXISTS "Authenticated can update plans" ON plans;
DROP POLICY IF EXISTS "Authenticated can delete plans" ON plans;

CREATE POLICY "Anyone can read plans"
  ON plans FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert plans"
  ON plans FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update plans"
  ON plans FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete plans"
  ON plans FOR DELETE
  TO anon, authenticated
  USING (true);

-- Users
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

CREATE POLICY "Anyone can read users"
  ON users FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert users"
  ON users FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update users"
  ON users FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Profiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert profiles"
  ON profiles FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update profiles"
  ON profiles FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Professional services
DROP POLICY IF EXISTS "Everyone can read professional services" ON professional_services;
DROP POLICY IF EXISTS "Authenticated can insert services" ON professional_services;
DROP POLICY IF EXISTS "Authenticated can update services" ON professional_services;
DROP POLICY IF EXISTS "Authenticated can delete services" ON professional_services;

CREATE POLICY "Anyone can read services"
  ON professional_services FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert services"
  ON professional_services FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update services"
  ON professional_services FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete services"
  ON professional_services FOR DELETE
  TO anon, authenticated
  USING (true);

-- Service requests
DROP POLICY IF EXISTS "Authenticated can read service_requests" ON service_requests;
DROP POLICY IF EXISTS "Authenticated can insert service_requests" ON service_requests;
DROP POLICY IF EXISTS "Authenticated can update service_requests" ON service_requests;
DROP POLICY IF EXISTS "Authenticated can delete service_requests" ON service_requests;

CREATE POLICY "Anyone can read service_requests"
  ON service_requests FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert service_requests"
  ON service_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update service_requests"
  ON service_requests FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete service_requests"
  ON service_requests FOR DELETE
  TO anon, authenticated
  USING (true);

-- Conversations
DROP POLICY IF EXISTS "Authenticated can read conversations" ON conversations;
DROP POLICY IF EXISTS "Authenticated can insert conversations" ON conversations;

CREATE POLICY "Anyone can read conversations"
  ON conversations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert conversations"
  ON conversations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Messages
DROP POLICY IF EXISTS "Authenticated can read messages" ON messages;
DROP POLICY IF EXISTS "Authenticated can insert messages" ON messages;
DROP POLICY IF EXISTS "Authenticated can update messages" ON messages;

CREATE POLICY "Anyone can read messages"
  ON messages FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert messages"
  ON messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update messages"
  ON messages FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Appointments
DROP POLICY IF EXISTS "Authenticated can read appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated can insert appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated can update appointments" ON appointments;

CREATE POLICY "Anyone can read appointments"
  ON appointments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert appointments"
  ON appointments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update appointments"
  ON appointments FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Admin messages
DROP POLICY IF EXISTS "Authenticated can read admin_messages" ON admin_messages;
DROP POLICY IF EXISTS "Authenticated can insert admin_messages" ON admin_messages;
DROP POLICY IF EXISTS "Authenticated can update admin_messages" ON admin_messages;

CREATE POLICY "Anyone can read admin_messages"
  ON admin_messages FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert admin_messages"
  ON admin_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update admin_messages"
  ON admin_messages FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
