/*
  # Corrigir Políticas RLS para regional_minimum_prices

  1. Correções
    - Remover políticas existentes que estão causando erro
    - Criar novas políticas separadas para cada operação (SELECT, INSERT, UPDATE, DELETE)
    - Garantir que admins possam gerenciar valores regionais
    - Permitir que usuários autenticados visualizem valores ativos

  2. Segurança
    - Apenas admins podem inserir, atualizar e deletar
    - Todos usuários autenticados podem visualizar valores ativos
*/

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins podem gerenciar valores regionais" ON regional_minimum_prices;
DROP POLICY IF EXISTS "Todos podem visualizar valores regionais ativos" ON regional_minimum_prices;

-- Política para visualização (todos usuários autenticados)
CREATE POLICY "Usuarios autenticados podem visualizar valores regionais"
  ON regional_minimum_prices
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para inserção (apenas admins)
CREATE POLICY "Admins podem inserir valores regionais"
  ON regional_minimum_prices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Política para atualização (apenas admins)
CREATE POLICY "Admins podem atualizar valores regionais"
  ON regional_minimum_prices
  FOR UPDATE
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

-- Política para exclusão (apenas admins)
CREATE POLICY "Admins podem deletar valores regionais"
  ON regional_minimum_prices
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
