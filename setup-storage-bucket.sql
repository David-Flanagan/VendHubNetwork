-- Setup Storage Bucket for Company Images
-- This script creates the company-images bucket and sets up RLS policies

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-images',
  'company-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Policy for uploading images (only authenticated users can upload)
CREATE POLICY "Authenticated users can upload images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'company-images' AND
  auth.role() = 'authenticated'
);

-- Policy for viewing images (public read access)
CREATE POLICY "Public can view company images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'company-images'
);

-- Policy for updating images (only authenticated users can update)
CREATE POLICY "Authenticated users can update images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'company-images' AND
  auth.role() = 'authenticated'
);

-- Policy for deleting images (only authenticated users can delete)
CREATE POLICY "Authenticated users can delete images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'company-images' AND
  auth.role() = 'authenticated'
);

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; 