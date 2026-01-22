/*
  # Add registration number to professionals table

  1. Changes
    - Add `registration_number` column to `professionals` table
      - Type: text
      - Optional field (can be null for existing professionals)
    
  2. Purpose
    - Store professional registration number (e.g., medical license, CRM, etc.)
    - This will be populated when admin approves a professional application
*/

-- Add registration_number column to professionals table
ALTER TABLE professionals 
ADD COLUMN IF NOT EXISTS registration_number text;

-- Add comment for documentation
COMMENT ON COLUMN professionals.registration_number IS 'Professional registration number (e.g., medical license, CRM, etc.)';