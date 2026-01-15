/*
  # Adicionar campos de duração e detalhes de serviço aos planos

  1. Mudanças na tabela `plans`
    - Adicionar coluna `hours` (integer) - Número de horas do plano
    - Adicionar coluna `days` (integer) - Número de dias do plano
    - Adicionar coluna `periods` (text[]) - Períodos disponíveis (manhã, tarde, noite)
    - Adicionar coluna `locations` (text[]) - Locais de atendimento (domiciliar, hospital, deslocamento)
  
  2. Notas
    - Mantém compatibilidade com planos existentes
    - Campos opcionais para não quebrar dados existentes
*/

-- Adicionar novas colunas à tabela plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'hours'
  ) THEN
    ALTER TABLE plans ADD COLUMN hours integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'days'
  ) THEN
    ALTER TABLE plans ADD COLUMN days integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'periods'
  ) THEN
    ALTER TABLE plans ADD COLUMN periods text[] DEFAULT ARRAY[]::text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'locations'
  ) THEN
    ALTER TABLE plans ADD COLUMN locations text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;