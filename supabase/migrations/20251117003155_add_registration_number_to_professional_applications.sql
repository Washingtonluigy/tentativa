/*
  # Add Registration Number to Professional Applications
  
  Adds a registration_number field to the professional_applications table to ensure
  professionals have proper credentials.
  
  ## Changes
  - Add registration_number column (required field)
  - Column stores professional registration numbers (e.g., COREN, CRM, CREFITO)
*/

-- Add registration_number column to professional_applications
ALTER TABLE public.professional_applications 
ADD COLUMN IF NOT EXISTS registration_number text NOT NULL DEFAULT '';

-- Remove default after adding the column
ALTER TABLE public.professional_applications 
ALTER COLUMN registration_number DROP DEFAULT;
