/*
  # Create storage bucket for category images

  1. New Storage Bucket
    - Create `category-images` bucket for storing category pictures
    - Public access enabled for client viewing
  
  2. Security
    - Allow public read access for all users
    - Allow authenticated users to upload images
    - Allow authenticated users to update/delete their uploads
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can view category images'
  ) THEN
    CREATE POLICY "Public can view category images"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'category-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload category images'
  ) THEN
    CREATE POLICY "Authenticated users can upload category images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'category-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can update category images'
  ) THEN
    CREATE POLICY "Authenticated users can update category images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'category-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete category images'
  ) THEN
    CREATE POLICY "Authenticated users can delete category images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'category-images');
  END IF;
END $$;
