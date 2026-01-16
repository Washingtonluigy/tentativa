/*
  # Permitir mesmo email com senhas diferentes para cliente e profissional

  1. Alterações
    - Remove constraint UNIQUE do email na tabela users
    - Adiciona constraint UNIQUE composta (email, role)
    - Isso permite que o mesmo email tenha um registro como 'client' e outro como 'professional'
    - Cada registro terá sua própria senha (password_hash)
  
  2. Segurança
    - Mantém RLS habilitado
    - Um email pode ter no máximo 2 registros: um como cliente e um como profissional
*/

-- Remove a constraint UNIQUE do email
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Adiciona constraint UNIQUE composta (email, role)
-- Isso permite mesmo email com roles diferentes, mas não permite duplicatas de email+role
ALTER TABLE users ADD CONSTRAINT users_email_role_unique UNIQUE (email, role);

-- Adicionar índice para melhorar performance nas buscas por email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
