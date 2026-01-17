/*
  # Mercado Pago OAuth Integration

  ## Description
  This migration creates the infrastructure for Mercado Pago OAuth integration,
  allowing professionals to connect their Mercado Pago accounts for automatic payment splitting.

  ## Changes
  
  ### 1. New Tables
  
  #### `mercadopago_oauth_tokens`
  Stores OAuth tokens for each professional who connects their Mercado Pago account
  - `id` (uuid, primary key) - Unique identifier
  - `professional_id` (uuid, foreign key) - References professionals table
  - `user_id` (text) - Mercado Pago user ID
  - `access_token` (text) - OAuth access token for API calls
  - `refresh_token` (text) - Token used to refresh the access token
  - `token_type` (text) - Type of token (usually "Bearer")
  - `expires_in` (integer) - Token expiration time in seconds
  - `expires_at` (timestamptz) - Calculated expiration timestamp
  - `scope` (text) - OAuth scopes granted
  - `public_key` (text) - Professional's Mercado Pago public key
  - `is_active` (boolean) - Whether the connection is active
  - `created_at` (timestamptz) - When the connection was created
  - `updated_at` (timestamptz) - Last token refresh timestamp

  ### 2. Indexes
  - Index on `professional_id` for fast lookups
  - Index on `expires_at` for token refresh queries

  ### 3. Security
  - RLS disabled for edge functions to manage tokens securely
*/

-- Create mercadopago_oauth_tokens table
CREATE TABLE IF NOT EXISTS mercadopago_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id uuid REFERENCES professionals(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_type text DEFAULT 'Bearer',
  expires_in integer NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text,
  public_key text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(professional_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mercadopago_tokens_professional 
  ON mercadopago_oauth_tokens(professional_id);

CREATE INDEX IF NOT EXISTS idx_mercadopago_tokens_expires 
  ON mercadopago_oauth_tokens(expires_at);

-- Disable RLS (tokens will be managed by edge functions)
ALTER TABLE mercadopago_oauth_tokens DISABLE ROW LEVEL SECURITY;

-- Add mercadopago_connected field to professionals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'professionals' AND column_name = 'mercadopago_connected'
  ) THEN
    ALTER TABLE professionals ADD COLUMN mercadopago_connected boolean DEFAULT false;
  END IF;
END $$;

-- Create table for payment transactions
CREATE TABLE IF NOT EXISTS mercadopago_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_request_id uuid REFERENCES service_requests(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES professionals(id) ON DELETE CASCADE,
  client_id uuid REFERENCES users(id) ON DELETE CASCADE,
  preference_id text NOT NULL,
  payment_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
  payment_type text,
  payment_method text,
  transaction_amount decimal(10,2),
  application_fee decimal(10,2),
  net_amount decimal(10,2),
  external_reference text,
  mercadopago_user_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mp_transactions_request 
  ON mercadopago_transactions(service_request_id);

CREATE INDEX IF NOT EXISTS idx_mp_transactions_professional 
  ON mercadopago_transactions(professional_id);

CREATE INDEX IF NOT EXISTS idx_mp_transactions_payment 
  ON mercadopago_transactions(payment_id);

-- Disable RLS
ALTER TABLE mercadopago_transactions DISABLE ROW LEVEL SECURITY;