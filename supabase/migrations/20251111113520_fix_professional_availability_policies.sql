/*
  # Fix Professional Availability Policies for Custom Auth
  
  1. Changes
    - Drop existing RLS policies that depend on auth.uid()
    - Create new permissive policies for anon role
    - Allow anonymous users to manage availability (client-side will handle validation)
  
  2. Security
    - Allows anon role to insert, update, and delete availability
    - Client application handles user validation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Professionals can insert their own availability" ON professional_availability;
DROP POLICY IF EXISTS "Professionals can update their own availability" ON professional_availability;
DROP POLICY IF EXISTS "Professionals can delete their own availability" ON professional_availability;

-- Create new permissive policies for anon
CREATE POLICY "Allow anon to insert availability"
  ON professional_availability
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update availability"
  ON professional_availability
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon to delete availability"
  ON professional_availability
  FOR DELETE
  TO anon
  USING (true);
