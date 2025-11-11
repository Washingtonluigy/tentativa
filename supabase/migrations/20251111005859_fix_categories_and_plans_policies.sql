/*
  # Corrigir políticas RLS para categories e plans
  
  Adiciona políticas de INSERT para permitir que usuários anônimos
  possam criar categorias e planos (necessário porque o sistema atual
  não usa autenticação do Supabase, apenas custom auth).
*/

-- Allow anon to insert categories
CREATE POLICY "Allow anon to insert categories"
  ON categories FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon to update categories
CREATE POLICY "Allow anon to update categories"
  ON categories FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon to delete categories
CREATE POLICY "Allow anon to delete categories"
  ON categories FOR DELETE
  TO anon
  USING (true);

-- Allow anon to insert plans
CREATE POLICY "Allow anon to insert plans"
  ON plans FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon to update plans
CREATE POLICY "Allow anon to update plans"
  ON plans FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon to delete plans
CREATE POLICY "Allow anon to delete plans"
  ON plans FOR DELETE
  TO anon
  USING (true);

-- Allow anon to insert professionals
CREATE POLICY "Allow anon to insert professionals"
  ON professionals FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon to update professionals
CREATE POLICY "Allow anon to update professionals"
  ON professionals FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon to delete professionals
CREATE POLICY "Allow anon to delete professionals"
  ON professionals FOR DELETE
  TO anon
  USING (true);

-- Allow anon to insert professional_services
CREATE POLICY "Allow anon to insert professional_services"
  ON professional_services FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon to update professional_services
CREATE POLICY "Allow anon to update professional_services"
  ON professional_services FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon to delete professional_services
CREATE POLICY "Allow anon to delete professional_services"
  ON professional_services FOR DELETE
  TO anon
  USING (true);