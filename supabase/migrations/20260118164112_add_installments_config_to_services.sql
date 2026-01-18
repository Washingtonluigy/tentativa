/*
  # Add Installments Configuration to Professional Services

  1. Changes
    - Add `max_installments` column to `professional_services` table
      - Controls how many installments the professional allows
      - Default: 1 (no installments, only cash payment)
      - Can be set to 1, 2, 3, 6, 12, etc.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'professional_services' AND column_name = 'max_installments'
  ) THEN
    ALTER TABLE professional_services ADD COLUMN max_installments integer DEFAULT 1 NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN professional_services.max_installments IS 'Maximum number of installments allowed for this service (1 = no installments)';