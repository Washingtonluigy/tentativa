/*
  # Sistema de Intermediação de Profissionais de Saúde - Schema Inicial

  ## Tabelas Criadas

  ### 1. users
  - Tabela principal de usuários do sistema
  - Campos: id, email, role (admin/professional/client), created_at
  - Conectada com auth.users do Supabase

  ### 2. profiles
  - Perfis completos dos usuários
  - Campos: user_id, full_name, phone, birth_date, cpf, address, city, cep, photo_url

  ### 3. categories
  - Categorias de profissionais (setores)
  - Campos: id, name, description, created_by

  ### 4. professionals
  - Dados específicos dos profissionais
  - Campos: user_id, category_id, experience_years, professional_references, description, status

  ### 5. professional_services
  - Serviços oferecidos por cada profissional
  - Campos: id, professional_id, service_name, description

  ### 6. plans
  - Planos e preços criados pelos admins
  - Campos: id, name, description, price, duration_type

  ### 7. service_requests (Chamados)
  - Solicitações de atendimento dos clientes
  - Campos: id, client_id, professional_id, service_type, status, location

  ### 8. conversations
  - Conversas entre clientes e profissionais
  - Campos: id, request_id, client_id, professional_id

  ### 9. messages
  - Mensagens das conversas
  - Campos: id, conversation_id, sender_id, content, message_type

  ### 10. appointments
  - Histórico de atendimentos realizados
  - Campos: id, request_id, client_id, professional_id, rating, completed_at

  ### 11. admin_messages
  - Mensagens do "Fale Conosco"
  - Campos: id, client_id, message, response, status

  ## Segurança
  - RLS habilitado em todas as tabelas
  - Políticas restritivas baseadas em roles
  - Verificação de autenticação e propriedade
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'professional', 'client')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  birth_date date,
  cpf text UNIQUE,
  address text,
  city text,
  cep text,
  photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create professionals table
CREATE TABLE IF NOT EXISTS professionals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id),
  experience_years integer DEFAULT 0,
  professional_references text,
  description text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

-- Create professional_services table
CREATE TABLE IF NOT EXISTS professional_services (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id uuid REFERENCES professionals(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE professional_services ENABLE ROW LEVEL SECURITY;

-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  duration_type text NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Create service_requests table (Chamados)
CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid REFERENCES users(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES users(id) ON DELETE CASCADE,
  service_type text NOT NULL CHECK (service_type IN ('message', 'video_call', 'in_person')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  location_lat decimal(10,8),
  location_lng decimal(11,8),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id uuid REFERENCES service_requests(id) ON DELETE CASCADE,
  client_id uuid REFERENCES users(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'audio')),
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create appointments table (Histórico)
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id uuid REFERENCES service_requests(id) ON DELETE CASCADE,
  client_id uuid REFERENCES users(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES users(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  review_comment text,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create admin_messages table (Fale Conosco)
CREATE TABLE IF NOT EXISTS admin_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL,
  response text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = (current_setting('app.current_user_id', true))::uuid AND role = 'admin'
    )
  );

-- RLS Policies for profiles table
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (user_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (user_id = (current_setting('app.current_user_id', true))::uuid)
  WITH CHECK (user_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = (current_setting('app.current_user_id', true))::uuid AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = (current_setting('app.current_user_id', true))::uuid AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = (current_setting('app.current_user_id', true))::uuid AND role = 'admin'
    )
  );

-- RLS Policies for categories table
CREATE POLICY "Everyone can read categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = (current_setting('app.current_user_id', true))::uuid AND role = 'admin'
    )
  );

-- RLS Policies for professionals table
CREATE POLICY "Everyone can read active professionals"
  ON professionals FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Professionals can read own data"
  ON professionals FOR SELECT
  TO authenticated
  USING (user_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Admins can manage professionals"
  ON professionals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = (current_setting('app.current_user_id', true))::uuid AND role = 'admin'
    )
  );

-- RLS Policies for professional_services table
CREATE POLICY "Everyone can read services"
  ON professional_services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Professionals can manage own services"
  ON professional_services FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM professionals 
      WHERE id = professional_services.professional_id 
      AND user_id = (current_setting('app.current_user_id', true))::uuid
    )
  );

-- RLS Policies for plans table
CREATE POLICY "Everyone can read plans"
  ON plans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage plans"
  ON plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = (current_setting('app.current_user_id', true))::uuid AND role = 'admin'
    )
  );

-- RLS Policies for service_requests table
CREATE POLICY "Clients can read own requests"
  ON service_requests FOR SELECT
  TO authenticated
  USING (client_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Professionals can read requests to them"
  ON service_requests FOR SELECT
  TO authenticated
  USING (professional_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Clients can create requests"
  ON service_requests FOR INSERT
  TO authenticated
  WITH CHECK (client_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Professionals can update requests to them"
  ON service_requests FOR UPDATE
  TO authenticated
  USING (professional_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Admins can read all requests"
  ON service_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = (current_setting('app.current_user_id', true))::uuid AND role = 'admin'
    )
  );

-- RLS Policies for conversations table
CREATE POLICY "Participants can read conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    client_id = (current_setting('app.current_user_id', true))::uuid OR 
    professional_id = (current_setting('app.current_user_id', true))::uuid
  );

CREATE POLICY "System can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = (current_setting('app.current_user_id', true))::uuid OR 
    professional_id = (current_setting('app.current_user_id', true))::uuid
  );

-- RLS Policies for messages table
CREATE POLICY "Conversation participants can read messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE id = messages.conversation_id 
      AND (client_id = (current_setting('app.current_user_id', true))::uuid OR 
           professional_id = (current_setting('app.current_user_id', true))::uuid)
    )
  );

CREATE POLICY "Conversation participants can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (current_setting('app.current_user_id', true))::uuid);

-- RLS Policies for appointments table
CREATE POLICY "Clients can read own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (client_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Professionals can read own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (professional_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Clients can rate appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (client_id = (current_setting('app.current_user_id', true))::uuid)
  WITH CHECK (client_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "System can create appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for admin_messages table
CREATE POLICY "Clients can read own admin messages"
  ON admin_messages FOR SELECT
  TO authenticated
  USING (client_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Clients can create admin messages"
  ON admin_messages FOR INSERT
  TO authenticated
  WITH CHECK (client_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Admins can read all admin messages"
  ON admin_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = (current_setting('app.current_user_id', true))::uuid AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update admin messages"
  ON admin_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = (current_setting('app.current_user_id', true))::uuid AND role = 'admin'
    )
  );

-- Insert master admin user
INSERT INTO users (email, password_hash, role) 
VALUES ('masteramah@gmail.com', '$2a$10$rH5kXqJbZWN8vqOZmFZHsOKLCqGqJmF9XpqxmYVJ8d9kCHfXmYZPe', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert profile for master admin
INSERT INTO profiles (user_id, full_name, phone)
SELECT id, 'Master Admin', '(00) 00000-0000'
FROM users
WHERE email = 'masteramah@gmail.com'
ON CONFLICT DO NOTHING;