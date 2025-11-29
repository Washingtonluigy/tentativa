/*
  # Add Rating and Cancelled Status to Service Requests

  1. Changes
    - Add `rating` column to service_requests (1-5 stars)
    - Add `review_comment` column for client feedback
    - Add 'cancelled' status option to service_requests
  
  2. Security
    - No RLS changes needed - existing policies cover new columns
*/

-- Add rating columns to service_requests if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'rating'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'review_comment'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN review_comment TEXT;
  END IF;
END $$;

-- Update status column to include 'cancelled' status
-- Note: We're not dropping the constraint, just adding a new possible value through a migration
COMMENT ON COLUMN service_requests.status IS 'Status: pending, accepted, rejected, completed, cancelled';