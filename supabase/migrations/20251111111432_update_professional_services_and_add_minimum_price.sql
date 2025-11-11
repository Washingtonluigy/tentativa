/*
  # Update Professional Services System and Add Minimum Price

  1. Changes to professionals table
    - Add `minimum_price` column (minimum price set by admin)

  2. Changes to professional_services table
    - Rename `service_name` to `name` for consistency
    - Add pricing columns for different service types:
      - `price_message` (decimal) - Price for message-based service
      - `price_video` (decimal) - Price for video call service
      - `price_local` (decimal) - Price for in-person/local service
    - Add `is_active` column
    - Add `updated_at` column

  3. Security
    - Update RLS policies for professional_services
*/

-- Add minimum_price to professionals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'professionals' AND column_name = 'minimum_price'
  ) THEN
    ALTER TABLE professionals ADD COLUMN minimum_price decimal(10,2) DEFAULT 0.00;
  END IF;
END $$;

-- Update professional_services table structure
DO $$
BEGIN
  -- Rename service_name to name if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'professional_services' AND column_name = 'service_name'
  ) THEN
    ALTER TABLE professional_services RENAME COLUMN service_name TO name;
  END IF;

  -- Add price_message column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'professional_services' AND column_name = 'price_message'
  ) THEN
    ALTER TABLE professional_services ADD COLUMN price_message decimal(10,2) DEFAULT NULL;
  END IF;

  -- Add price_video column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'professional_services' AND column_name = 'price_video'
  ) THEN
    ALTER TABLE professional_services ADD COLUMN price_video decimal(10,2) DEFAULT NULL;
  END IF;

  -- Add price_local column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'professional_services' AND column_name = 'price_local'
  ) THEN
    ALTER TABLE professional_services ADD COLUMN price_local decimal(10,2) DEFAULT NULL;
  END IF;

  -- Add is_active column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'professional_services' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE professional_services ADD COLUMN is_active boolean DEFAULT true;
  END IF;

  -- Add updated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'professional_services' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE professional_services ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active services" ON professional_services;
DROP POLICY IF EXISTS "Professionals can view own services" ON professional_services;
DROP POLICY IF EXISTS "Professionals can create own services" ON professional_services;
DROP POLICY IF EXISTS "Professionals can update own services" ON professional_services;
DROP POLICY IF EXISTS "Professionals can delete own services" ON professional_services;

-- Create new policies

-- Anyone can view active services
CREATE POLICY "Anyone can view active services"
  ON professional_services FOR SELECT
  USING (is_active = true);

-- Professionals can view all their own services (including inactive)
CREATE POLICY "Professionals can view own services"
  ON professional_services FOR SELECT
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- Professionals can insert their own services
CREATE POLICY "Professionals can create own services"
  ON professional_services FOR INSERT
  TO authenticated
  WITH CHECK (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- Professionals can update their own services
CREATE POLICY "Professionals can update own services"
  ON professional_services FOR UPDATE
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- Professionals can delete their own services
CREATE POLICY "Professionals can delete own services"
  ON professional_services FOR DELETE
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_professional_services_professional_id 
  ON professional_services(professional_id);

CREATE INDEX IF NOT EXISTS idx_professional_services_active 
  ON professional_services(is_active);
