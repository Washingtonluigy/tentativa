/*
  # Add payment error field to service requests

  1. Changes
    - Add `payment_error` column to `service_requests` table to store error messages when payment link generation fails
  
  2. Purpose
    - Allows professionals to communicate payment issues to clients
    - Provides clear error messages when Mercado Pago integration fails
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_requests' AND column_name = 'payment_error'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN payment_error TEXT DEFAULT NULL;
  END IF;
END $$;