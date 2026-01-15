/*
  # Adicionar flag de atendimento urgente para profissionais

  1. Alterações
    - Adiciona coluna `accepts_urgent_requests` na tabela `professionals`
      - Indica se o profissional aceita atender chamados urgentes
      - Valor padrão: false
  
  2. Notas
    - Esta coluna permite que profissionais definam se querem aparecer em buscas urgentes
    - Profissionais podem ativar/desativar a qualquer momento
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'professionals' AND column_name = 'accepts_urgent_requests'
  ) THEN
    ALTER TABLE professionals ADD COLUMN accepts_urgent_requests boolean DEFAULT false;
  END IF;
END $$;