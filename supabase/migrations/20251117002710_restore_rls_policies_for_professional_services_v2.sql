/*
  # Restore RLS Policies for Professional Services
  
  This migration restores the necessary RLS policies that were accidentally removed,
  ensuring data access is restored while maintaining security improvements.
  
  ## Changes
  - Restores anon access policies for professional_services table
  - Keeps optimized auth function calls with SELECT subqueries
*/

-- Drop and recreate anon access policies for professional_services
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Allow anon to read professional_services" ON public.professional_services;
  DROP POLICY IF EXISTS "Allow anon to insert professional_services" ON public.professional_services;
  DROP POLICY IF EXISTS "Allow anon to update professional_services" ON public.professional_services;
  DROP POLICY IF EXISTS "Allow anon to delete professional_services" ON public.professional_services;
END $$;

-- Recreate anon access policies
CREATE POLICY "Allow anon to read professional_services"
  ON public.professional_services
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to insert professional_services"
  ON public.professional_services
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update professional_services"
  ON public.professional_services
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon to delete professional_services"
  ON public.professional_services
  FOR DELETE
  TO anon
  USING (true);
