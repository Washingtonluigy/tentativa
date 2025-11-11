/*
  # Fix storage policies for category images

  1. Changes
    - Drop existing policies
    - Create new policies with proper permissions
    - Allow anonymous users to upload (for admin without auth)
    - Allow public read access
  
  2. Security
    - Public read access for all users
    - Public write access for uploads
*/

DROP POLICY IF EXISTS "Public can view category images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload category images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update category images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete category images" ON storage.objects;

CREATE POLICY "Anyone can view category images"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');

CREATE POLICY "Anyone can upload category images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'category-images');

CREATE POLICY "Anyone can update category images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'category-images');

CREATE POLICY "Anyone can delete category images"
ON storage.objects FOR DELETE
USING (bucket_id = 'category-images');
