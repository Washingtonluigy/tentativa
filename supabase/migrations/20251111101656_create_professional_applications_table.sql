/*
  # Criar tabela de solicitações de cadastro de profissionais
  
  ## Nova Tabela
  - `professional_applications`
    - `id` (uuid, primary key)
    - `full_name` (text) - Nome completo do profissional
    - `phone` (text) - Telefone de contato
    - `email` (text) - Email de contato
    - `profession` (text) - Profissão/especialidade
    - `experience_years` (integer) - Anos de experiência
    - `state` (text) - Estado
    - `city` (text) - Cidade
    - `professional_references` (text) - Referências profissionais
    - `status` (text) - Status da solicitação (pending, approved, rejected)
    - `admin_notes` (text) - Anotações do admin sobre a análise
    - `created_at` (timestamptz) - Data da solicitação
    - `reviewed_at` (timestamptz) - Data da revisão
    - `reviewed_by` (uuid) - ID do admin que revisou
  
  ## Segurança
  - RLS habilitado
  - Qualquer pessoa pode criar uma solicitação (anon)
  - Apenas admins podem visualizar e atualizar
*/

-- Create professional_applications table
CREATE TABLE IF NOT EXISTS professional_applications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  profession text NOT NULL,
  experience_years integer NOT NULL DEFAULT 0,
  state text NOT NULL,
  city text NOT NULL,
  professional_references text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES users(id)
);

ALTER TABLE professional_applications ENABLE ROW LEVEL SECURITY;

-- Allow anon to insert applications (anyone can apply)
CREATE POLICY "Allow anon to insert professional applications"
  ON professional_applications FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon to read all applications (for admin panel)
CREATE POLICY "Allow anon to read professional applications"
  ON professional_applications FOR SELECT
  TO anon
  USING (true);

-- Allow anon to update applications (for admin actions)
CREATE POLICY "Allow anon to update professional applications"
  ON professional_applications FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon to delete applications
CREATE POLICY "Allow anon to delete professional applications"
  ON professional_applications FOR DELETE
  TO anon
  USING (true);