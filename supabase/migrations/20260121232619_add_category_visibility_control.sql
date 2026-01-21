/*
  # Adicionar controle de visibilidade de categorias

  1. Alterações
    - Adiciona coluna `is_visible` na tabela `categories`
      - Tipo: boolean
      - Default: true (todas as categorias existentes permanecem visíveis)
      - Permite ao admin ocultar categorias específicas
  
  2. Notas
    - Categorias ocultas não aparecem para clientes
    - Admin pode visualizar e gerenciar todas as categorias
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'is_visible'
  ) THEN
    ALTER TABLE categories ADD COLUMN is_visible boolean DEFAULT true NOT NULL;
  END IF;
END $$;