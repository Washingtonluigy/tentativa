/*
  # Adicionar tipos de urgência por modalidade de atendimento

  1. Alterações na tabela `professionals`
    - Adiciona `accepts_urgent_message` (boolean) - Aceita urgência por mensagem
    - Adiciona `accepts_urgent_video` (boolean) - Aceita urgência por chamada de vídeo
    - Adiciona `accepts_urgent_home` (boolean) - Aceita urgência por atendimento domiciliar
    - Remove dependência do campo `accepts_urgent_requests` antigo (mantém para compatibilidade)

  2. Funcionalidade
    - Profissionais podem escolher quais tipos de urgência aceitam
    - Clientes filtram profissionais pelo tipo de urgência específico que precisam
    - Sistema verifica disponibilidade por modalidade de atendimento

  3. Notas
    - Valores padrão: false (profissional precisa ativar explicitamente)
    - Permite combinações (ex: aceita mensagem E vídeo, mas não domiciliar)
*/

-- Adicionar colunas para tipos específicos de urgência
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS accepts_urgent_message boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS accepts_urgent_video boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS accepts_urgent_home boolean DEFAULT false;

-- Comentários nas colunas para documentação
COMMENT ON COLUMN professionals.accepts_urgent_message IS 'Aceita chamados urgentes por mensagem';
COMMENT ON COLUMN professionals.accepts_urgent_video IS 'Aceita chamados urgentes por chamada de vídeo';
COMMENT ON COLUMN professionals.accepts_urgent_home IS 'Aceita chamados urgentes por atendimento domiciliar';
