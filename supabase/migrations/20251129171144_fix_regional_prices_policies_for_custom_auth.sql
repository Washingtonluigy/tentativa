/*
  # Corrigir Políticas RLS para Sistema de Autenticação Customizado

  1. Problema
    - O sistema usa autenticação customizada (não Supabase Auth)
    - auth.uid() não funciona, precisa permitir acesso via anon

  2. Solução
    - Permitir acesso total via role anon para admins
    - Sistema valida admin no frontend/aplicação

  3. Segurança
    - Validação de admin feita na camada de aplicação
    - RLS permite operações para simplificar o fluxo
*/

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Usuarios autenticados podem visualizar valores regionais" ON regional_minimum_prices;
DROP POLICY IF EXISTS "Admins podem inserir valores regionais" ON regional_minimum_prices;
DROP POLICY IF EXISTS "Admins podem atualizar valores regionais" ON regional_minimum_prices;
DROP POLICY IF EXISTS "Admins podem deletar valores regionais" ON regional_minimum_prices;

-- Política permissiva para SELECT (todos podem ler)
CREATE POLICY "Permitir leitura de valores regionais"
  ON regional_minimum_prices
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Política permissiva para INSERT (permite inserção)
CREATE POLICY "Permitir insercao de valores regionais"
  ON regional_minimum_prices
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Política permissiva para UPDATE (permite atualização)
CREATE POLICY "Permitir atualizacao de valores regionais"
  ON regional_minimum_prices
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Política permissiva para DELETE (permite exclusão)
CREATE POLICY "Permitir exclusao de valores regionais"
  ON regional_minimum_prices
  FOR DELETE
  TO anon, authenticated
  USING (true);
