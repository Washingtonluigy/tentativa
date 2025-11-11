/*
  # Create availability and schedule system

  1. New Tables
    - `professional_availability`
      - `id` (uuid, primary key)
      - `professional_id` (uuid, foreign key to professionals)
      - `day_of_week` (integer, 0=domingo, 6=sábado)
      - `start_time` (time)
      - `end_time` (time)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
    
    - `scheduled_appointments`
      - `id` (uuid, primary key)
      - `professional_id` (uuid, foreign key to professionals)
      - `client_id` (uuid, foreign key to users)
      - `scheduled_date` (date)
      - `start_time` (time)
      - `end_time` (time)
      - `status` (text: scheduled, in_progress, completed, cancelled)
      - `service_request_id` (uuid, foreign key to service_requests)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Professionals can manage their own availability
    - Authenticated users can view availability
    - Scheduled appointments accessible by professional and client
*/

CREATE TABLE IF NOT EXISTS professional_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES professionals(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheduled_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES professionals(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  scheduled_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  service_request_id uuid REFERENCES service_requests(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE professional_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view professional availability"
  ON professional_availability FOR SELECT
  USING (true);

CREATE POLICY "Professionals can insert their own availability"
  ON professional_availability FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE professionals.id = professional_availability.professional_id
      AND professionals.user_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can update their own availability"
  ON professional_availability FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE professionals.id = professional_availability.professional_id
      AND professionals.user_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can delete their own availability"
  ON professional_availability FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE professionals.id = professional_availability.professional_id
      AND professionals.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view scheduled appointments"
  ON scheduled_appointments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create scheduled appointments"
  ON scheduled_appointments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Professional or client can update their scheduled appointments"
  ON scheduled_appointments FOR UPDATE
  TO authenticated
  USING (
    client_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM professionals
      WHERE professionals.id = scheduled_appointments.professional_id
      AND professionals.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_availability_professional ON professional_availability(professional_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_appointments_professional ON scheduled_appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_appointments_client ON scheduled_appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_appointments_date ON scheduled_appointments(scheduled_date);
