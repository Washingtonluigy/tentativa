/*
  # Add completed_at to service_requests

  1. Changes
    - Adds `completed_at` (timestamptz, nullable) to service_requests
      Used to track exactly when a service request was finalized.
      Populated when professional marks the request as 'completed'.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN completed_at timestamptz;
  END IF;
END $$;
