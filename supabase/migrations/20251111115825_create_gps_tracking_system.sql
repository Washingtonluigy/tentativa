/*
  # Create GPS Tracking System
  
  1. New Tables
    - `service_locations`
      - `id` (uuid, primary key) - Unique identifier
      - `service_request_id` (uuid, foreign key) - Reference to service request
      - `user_id` (uuid, foreign key) - User sharing location (client or professional)
      - `user_type` (text) - Type: 'client' or 'professional'
      - `latitude` (numeric) - Current latitude
      - `longitude` (numeric) - Current longitude
      - `accuracy` (numeric) - GPS accuracy in meters
      - `heading` (numeric, nullable) - Direction of movement
      - `speed` (numeric, nullable) - Speed in m/s
      - `timestamp` (timestamptz) - When location was recorded
      - `is_active` (boolean) - Whether tracking is currently active
      - `created_at` (timestamptz) - Record creation time
      - `updated_at` (timestamptz) - Last update time
  
  2. Security
    - Enable RLS on `service_locations` table
    - Allow anon users to insert, update, select, and delete locations
    - Client-side application handles user validation
  
  3. Indexes
    - Index on service_request_id for fast lookups
    - Index on user_id for user-specific queries
    - Index on timestamp for time-based queries
    - Index on is_active for active tracking queries
*/

-- Create service_locations table
CREATE TABLE IF NOT EXISTS service_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid REFERENCES service_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('client', 'professional')),
  latitude numeric(10, 8) NOT NULL,
  longitude numeric(11, 8) NOT NULL,
  accuracy numeric DEFAULT 0,
  heading numeric,
  speed numeric,
  timestamp timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_locations_request_id ON service_locations(service_request_id);
CREATE INDEX IF NOT EXISTS idx_service_locations_user_id ON service_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_service_locations_timestamp ON service_locations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_service_locations_active ON service_locations(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE service_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for anon access
CREATE POLICY "Allow anon to view all locations"
  ON service_locations
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to insert locations"
  ON service_locations
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update locations"
  ON service_locations
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon to delete locations"
  ON service_locations
  FOR DELETE
  TO anon
  USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_service_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_service_locations_updated_at
  BEFORE UPDATE ON service_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_service_locations_updated_at();
