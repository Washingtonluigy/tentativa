/*
  # Adicionar valores mínimos separados por tipo de atendimento

  1. Alterações na tabela `regional_minimum_prices`
    - Adiciona `minimum_price_message` (decimal) - Valor mínimo para atendimento por mensagem
    - Adiciona `minimum_price_video` (decimal) - Valor mínimo para chamada de vídeo
    - Adiciona `minimum_price_home` (decimal) - Valor mínimo para atendimento domiciliar
    - Mantém `minimum_price` antigo para compatibilidade

  2. Funcionalidade
    - Admin define valores mínimos específicos por estado e tipo de atendimento
    - Profissionais veem valores mínimos corretos ao cadastrar cada tipo de serviço
    - Previne "prostituição" de serviços com valores muito baixos
    - Cada modalidade tem seu valor mínimo justo

  3. Valores Padrão
    - 0.00 para todos (admin precisa configurar por estado)
*/

-- Adicionar colunas para valores mínimos por tipo de serviço
ALTER TABLE regional_minimum_prices
ADD COLUMN IF NOT EXISTS minimum_price_message decimal(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS minimum_price_video decimal(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS minimum_price_home decimal(10,2) DEFAULT 0.00;

-- Comentários nas colunas
COMMENT ON COLUMN regional_minimum_prices.minimum_price_message IS 'Valor mínimo para serviço por mensagem neste estado';
COMMENT ON COLUMN regional_minimum_prices.minimum_price_video IS 'Valor mínimo para serviço por chamada de vídeo neste estado';
COMMENT ON COLUMN regional_minimum_prices.minimum_price_home IS 'Valor mínimo para serviço de atendimento domiciliar neste estado';
