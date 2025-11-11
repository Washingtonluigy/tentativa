/*
  # Add image URL to categories table

  1. Changes
    - Add `image_url` column to `categories` table to store custom category images
    - This allows admin to customize the background image for each category
    - Images will be displayed in the client's service request interface
  
  2. Notes
    - Column allows NULL values for backward compatibility
    - Existing categories will have NULL image_url until updated by admin
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE categories ADD COLUMN image_url text;
  END IF;
END $$;
