/*
  # Sistema de Cidades Brasileiras

  1. Nova Tabela: brazilian_cities
    - `id` (uuid, primary key)
    - `state` (text) - Estado (ex: "Mato Grosso", "São Paulo")
    - `city` (text) - Nome da cidade
    - `active` (boolean) - Se esta cidade está ativa no sistema
    - `created_at` (timestamptz)

  2. Segurança
    - RLS desabilitado para permitir acesso público à lista de cidades
    
  3. Índices
    - Índice em (state, city) para buscas rápidas
    
  4. Dados Iniciais
    - Inserir algumas cidades principais de Mato Grosso, São Paulo e Rio de Janeiro
*/

-- Criar tabela de cidades brasileiras
CREATE TABLE IF NOT EXISTS brazilian_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL,
  city text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(state, city)
);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_cities_state_city ON brazilian_cities(state, city);
CREATE INDEX IF NOT EXISTS idx_cities_state ON brazilian_cities(state);

-- Inserir cidades principais
INSERT INTO brazilian_cities (state, city, active) VALUES
  -- Mato Grosso
  ('Mato Grosso', 'Cuiabá', true),
  ('Mato Grosso', 'Várzea Grande', true),
  ('Mato Grosso', 'Rondonópolis', true),
  ('Mato Grosso', 'Sinop', true),
  ('Mato Grosso', 'Tangará da Serra', true),
  ('Mato Grosso', 'Cáceres', true),
  ('Mato Grosso', 'Sorriso', true),
  ('Mato Grosso', 'Lucas do Rio Verde', true),
  ('Mato Grosso', 'Barra do Garças', true),
  ('Mato Grosso', 'Alta Floresta', true),
  ('Mato Grosso', 'Juína', true),
  ('Mato Grosso', 'Juara', true),
  ('Mato Grosso', 'Primavera do Leste', true),
  ('Mato Grosso', 'Colíder', true),
  
  -- São Paulo
  ('São Paulo', 'São Paulo', true),
  ('São Paulo', 'Guarulhos', true),
  ('São Paulo', 'Campinas', true),
  ('São Paulo', 'São Bernardo do Campo', true),
  ('São Paulo', 'Santo André', true),
  ('São Paulo', 'Osasco', true),
  ('São Paulo', 'Sorocaba', true),
  ('São Paulo', 'Ribeirão Preto', true),
  ('São Paulo', 'Santos', true),
  ('São Paulo', 'São José dos Campos', true),
  
  -- Rio de Janeiro
  ('Rio de Janeiro', 'Rio de Janeiro', true),
  ('Rio de Janeiro', 'São Gonçalo', true),
  ('Rio de Janeiro', 'Duque de Caxias', true),
  ('Rio de Janeiro', 'Nova Iguaçu', true),
  ('Rio de Janeiro', 'Niterói', true),
  ('Rio de Janeiro', 'Belford Roxo', true),
  ('Rio de Janeiro', 'Campos dos Goytacazes', true),
  ('Rio de Janeiro', 'São João de Meriti', true),
  ('Rio de Janeiro', 'Petrópolis', true),
  ('Rio de Janeiro', 'Volta Redonda', true)
ON CONFLICT (state, city) DO NOTHING;
