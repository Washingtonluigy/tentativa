/*
  # Add Cancellation Reason to Service Requests

  1. Changes
    - Add `cancellation_reason` column to `service_requests` table
    - Allow tracking why a service request was cancelled
    - Field is text type and nullable (only required when status is cancelled)
  
  2. Notes
    - This helps maintain transparency between clients and professionals
    - Cancellation reasons can be used for analytics and service improvement
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN cancellation_reason text;
  END IF;
END $$;