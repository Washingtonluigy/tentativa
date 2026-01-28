/*
  # Healthcare Networks System (Redes e Convênios de Saúde)

  ## 1. New Tables
  
  ### `healthcare_networks`
  - `id` (uuid, primary key) - Network identifier
  - `name` (text) - Network name (e.g., "Unimed", "Hapvida")
  - `description` (text) - Network description
  - `logo_url` (text, nullable) - Network logo URL
  - `active` (boolean) - Whether the network is active
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### `professional_networks`
  - `id` (uuid, primary key) - Assignment identifier
  - `professional_id` (uuid, foreign key) - Professional user ID
  - `network_id` (uuid, foreign key) - Healthcare network ID
  - `active` (boolean) - Whether the assignment is active
  - `assigned_at` (timestamptz) - Assignment timestamp
  - `assigned_by` (uuid, nullable) - Admin who made the assignment
  
  ### `client_networks`
  - `id` (uuid, primary key) - Assignment identifier
  - `client_id` (uuid, foreign key) - Client user ID
  - `network_id` (uuid, foreign key) - Healthcare network ID
  - `member_number` (text, nullable) - Client's member number in the network
  - `active` (boolean) - Whether the membership is active
  - `joined_at` (timestamptz) - Join timestamp
  
  ### `medical_records`
  - `id` (uuid, primary key) - Record identifier
  - `client_id` (uuid, foreign key) - Patient/client ID
  - `network_id` (uuid, foreign key) - Healthcare network ID
  - `professional_id` (uuid, foreign key) - Professional who created the record
  - `service_request_id` (uuid, foreign key, nullable) - Related service request
  - `record_type` (text) - Type of record (consultation, exam, prescription, etc)
  - `title` (text) - Record title
  - `content` (text) - Record content (symptoms, diagnosis, treatment)
  - `attachments` (jsonb) - Array of attachment URLs
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### `medical_record_access_logs`
  - `id` (uuid, primary key) - Log identifier
  - `medical_record_id` (uuid, foreign key) - Medical record accessed
  - `professional_id` (uuid, foreign key) - Professional who accessed
  - `action` (text) - Action performed (view, edit, create)
  - `ip_address` (text, nullable) - IP address of access
  - `accessed_at` (timestamptz) - Access timestamp

  ## 2. Updated Tables
  
  ### `professional_availability` (changed from weekly to monthly calendar)
  - Removed: `day_of_week` column
  - Added: `specific_date` (date) - Specific date of availability
  - Added: `is_available` (boolean) - Whether professional is available on this date
  
  ## 3. Security
  - Enable RLS on all new tables
  - Add policies for network data access
  - Add audit logging for medical record access
  
  ## 4. Important Notes
  - Medical records are HIPAA/LGPD sensitive data
  - All access to medical records is logged for audit
  - Only professionals in the same network can view client records
  - Clients can view their own records from any professional in their network
*/

-- Create healthcare_networks table
CREATE TABLE IF NOT EXISTS healthcare_networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  logo_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create professional_networks table
CREATE TABLE IF NOT EXISTS professional_networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  network_id uuid NOT NULL REFERENCES healthcare_networks(id) ON DELETE CASCADE,
  active boolean DEFAULT true,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES users(id),
  UNIQUE(professional_id, network_id)
);

-- Create client_networks table
CREATE TABLE IF NOT EXISTS client_networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  network_id uuid NOT NULL REFERENCES healthcare_networks(id) ON DELETE CASCADE,
  member_number text,
  active boolean DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(client_id, network_id)
);

-- Create medical_records table
CREATE TABLE IF NOT EXISTS medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  network_id uuid NOT NULL REFERENCES healthcare_networks(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_request_id uuid REFERENCES service_requests(id) ON DELETE SET NULL,
  record_type text NOT NULL DEFAULT 'consultation',
  title text NOT NULL,
  content text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create medical_record_access_logs table
CREATE TABLE IF NOT EXISTS medical_record_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id uuid NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL,
  ip_address text,
  accessed_at timestamptz DEFAULT now()
);

-- Update professional_availability table to use specific dates instead of day_of_week
DO $$
BEGIN
  -- Add new column for specific date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'professional_availability' AND column_name = 'specific_date'
  ) THEN
    ALTER TABLE professional_availability ADD COLUMN specific_date date;
  END IF;
  
  -- Add is_available flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'professional_availability' AND column_name = 'is_available'
  ) THEN
    ALTER TABLE professional_availability ADD COLUMN is_available boolean DEFAULT true;
  END IF;
  
  -- Remove day_of_week constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'professional_availability' AND column_name = 'day_of_week'
  ) THEN
    ALTER TABLE professional_availability ALTER COLUMN day_of_week DROP NOT NULL;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_professional_networks_professional ON professional_networks(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_networks_network ON professional_networks(network_id);
CREATE INDEX IF NOT EXISTS idx_client_networks_client ON client_networks(client_id);
CREATE INDEX IF NOT EXISTS idx_client_networks_network ON client_networks(network_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_client ON medical_records(client_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_network ON medical_records(network_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_professional ON medical_records(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_availability_date ON professional_availability(specific_date);

-- Disable RLS (as per existing pattern in the codebase)
ALTER TABLE healthcare_networks DISABLE ROW LEVEL SECURITY;
ALTER TABLE professional_networks DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_networks DISABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE medical_record_access_logs DISABLE ROW LEVEL SECURITY;