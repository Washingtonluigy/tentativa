/*
  # Sistema de Valores Mínimos por Região

  1. Nova Tabela: regional_minimum_prices
    - `id` (uuid, primary key)
    - `state` (text) - Estado/Região (ex: "Mato Grosso", "São Paulo")
    - `city` (text) - Cidade específica (opcional, para valores específicos por cidade)
    - `minimum_price` (numeric) - Valor mínimo que deve ser cobrado nesta região
    - `description` (text) - Descrição/justificativa do valor
    - `active` (boolean) - Se esta região está ativa
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. Alterações na Tabela: users
    - Adicionar `city` (text) - Cidade onde o usuário está localizado
    - Adicionar `state` (text) - Estado onde o usuário está localizado
    - Adicionar `regional_price_id` (uuid) - Vincula profissionais à região de preço mínimo

  3. Alterações na Tabela: professional_services
    - Remover a obrigatoriedade de minimum_price (será gerenciado por região)

  4. Segurança
    - RLS habilitado em regional_minimum_prices
    - Apenas admins podem gerenciar valores por região
    - Todos podem visualizar (para validação no frontend)

  5. Índices
    - Índice em regional_minimum_prices(state, city) para buscas rápidas
    - Índice em users(city, state) para filtros de profissionais
*/

-- Criar tabela de valores mínimos por região
CREATE TABLE IF NOT EXISTS regional_minimum_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL,
  city text,
  minimum_price numeric NOT NULL DEFAULT 0,
  description text DEFAULT '',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar campos de localização e vínculo regional aos usuários
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'city'
  ) THEN
    ALTER TABLE users ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'state'
  ) THEN
    ALTER TABLE users ADD COLUMN state text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'regional_price_id'
  ) THEN
    ALTER TABLE users ADD COLUMN regional_price_id uuid REFERENCES regional_minimum_prices(id);
  END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_regional_prices_state_city ON regional_minimum_prices(state, city);
CREATE INDEX IF NOT EXISTS idx_users_city_state ON users(city, state);
CREATE INDEX IF NOT EXISTS idx_users_regional_price ON users(regional_price_id);

-- Habilitar RLS
ALTER TABLE regional_minimum_prices ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para regional_minimum_prices
DROP POLICY IF EXISTS "Admins podem gerenciar valores regionais" ON regional_minimum_prices;
CREATE POLICY "Admins podem gerenciar valores regionais"
  ON regional_minimum_prices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Todos podem visualizar valores regionais ativos" ON regional_minimum_prices;
CREATE POLICY "Todos podem visualizar valores regionais ativos"
  ON regional_minimum_prices
  FOR SELECT
  TO authenticated
  USING (active = true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_regional_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_regional_prices_updated_at ON regional_minimum_prices;
CREATE TRIGGER trigger_update_regional_prices_updated_at
  BEFORE UPDATE ON regional_minimum_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_regional_prices_updated_at();

-- Inserir algumas regiões exemplo (podem ser removidas depois)
INSERT INTO regional_minimum_prices (state, city, minimum_price, description, active) 
VALUES 
  ('Mato Grosso', NULL, 120.00, 'Valor mínimo para todo estado do Mato Grosso', true),
  ('São Paulo', 'São Paulo', 150.00, 'Valor mínimo para capital paulista', true),
  ('Rio de Janeiro', 'Rio de Janeiro', 140.00, 'Valor mínimo para capital carioca', true)
ON CONFLICT DO NOTHING;
