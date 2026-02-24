/*
  # Add rating system, feedback tags, prescriptions, and chat attachments

  1. Modified Tables
    - `professionals`
      - `rating` (numeric, default 4.0) - professional rating score
      - `rating_count` (integer, default 0) - total ratings received
    - `messages`
      - `attachment_url` (text, nullable) - URL of attached file
      - `attachment_type` (text, nullable) - type: image, pdf

  2. New Tables
    - `professional_ratings`
      - `id` (uuid, primary key)
      - `professional_id` (text) - professional user_id
      - `client_id` (text) - client user_id
      - `service_request_id` (uuid) - associated service request
      - `rating` (integer) - 1-5 stars
      - `created_at` (timestamptz)
    - `professional_feedback`
      - `id` (uuid, primary key)
      - `professional_id` (text)
      - `client_id` (text)
      - `service_request_id` (uuid)
      - `tag` (text) - feedback keyword
      - `created_at` (timestamptz)
    - `prescriptions`
      - `id` (uuid, primary key)
      - `professional_id` (text)
      - `client_id` (text)
      - `service_request_id` (uuid)
      - `patient_name` (text)
      - `patient_cpf` (text)
      - `patient_birth_date` (text)
      - `professional_name` (text)
      - `professional_registration` (text)
      - `professional_category` (text)
      - `medications` (jsonb) - array of medication objects
      - `observations` (text)
      - `diagnosis` (text)
      - `created_at` (timestamptz)

  3. Storage
    - `chat-attachments` bucket for file uploads in chat

  4. Security
    - RLS disabled (matching existing project pattern)
*/

-- Add rating columns to professionals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'professionals' AND column_name = 'rating'
  ) THEN
    ALTER TABLE professionals ADD COLUMN rating numeric DEFAULT 4.0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'professionals' AND column_name = 'rating_count'
  ) THEN
    ALTER TABLE professionals ADD COLUMN rating_count integer DEFAULT 0;
  END IF;
END $$;

-- Add attachment columns to messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'attachment_url'
  ) THEN
    ALTER TABLE messages ADD COLUMN attachment_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'attachment_type'
  ) THEN
    ALTER TABLE messages ADD COLUMN attachment_type text;
  END IF;
END $$;

-- Create professional_ratings table
CREATE TABLE IF NOT EXISTS professional_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id text NOT NULL,
  client_id text NOT NULL,
  service_request_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE professional_ratings DISABLE ROW LEVEL SECURITY;

-- Create professional_feedback table
CREATE TABLE IF NOT EXISTS professional_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id text NOT NULL,
  client_id text NOT NULL,
  service_request_id uuid,
  tag text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE professional_feedback DISABLE ROW LEVEL SECURITY;

-- Create prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id text NOT NULL,
  client_id text NOT NULL,
  service_request_id uuid,
  patient_name text NOT NULL DEFAULT '',
  patient_cpf text DEFAULT '',
  patient_birth_date text DEFAULT '',
  professional_name text NOT NULL DEFAULT '',
  professional_registration text DEFAULT '',
  professional_category text DEFAULT '',
  medications jsonb DEFAULT '[]'::jsonb,
  observations text DEFAULT '',
  diagnosis text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE prescriptions DISABLE ROW LEVEL SECURITY;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat-attachments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow uploads to chat-attachments'
  ) THEN
    CREATE POLICY "Allow uploads to chat-attachments"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'chat-attachments');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow reads from chat-attachments'
  ) THEN
    CREATE POLICY "Allow reads from chat-attachments"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'chat-attachments');
  END IF;
END $$;
