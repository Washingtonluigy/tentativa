/*
  # Create storage bucket for professional photos

  1. New Storage Bucket
    - Create `professional-photos` bucket for storing professional profile pictures
    - Public access enabled for client viewing
  
  2. Security
    - Public read access for all users
    - Public write access for uploads
  
  3. Table Updates
    - Add photo_url to professional_applications table
    - Ensure profiles.photo_url exists
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('professional-photos', 'professional-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view professional photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'professional-photos');

CREATE POLICY "Anyone can upload professional photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'professional-photos');

CREATE POLICY "Anyone can update professional photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'professional-photos');

CREATE POLICY "Anyone can delete professional photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'professional-photos');

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'professional_applications' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE professional_applications ADD COLUMN photo_url text;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN photo_url text;
  END IF;
END $$;
