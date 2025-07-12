-- Add image_url column to global_products table
ALTER TABLE global_products 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create a storage bucket for product images (run this in Supabase Dashboard)
-- Note: You'll need to create this bucket manually in the Supabase Dashboard
-- Go to Storage > Create a new bucket
-- Bucket name: product-images
-- Public bucket: Yes
-- File size limit: 5MB
-- Allowed MIME types: image/*

-- Example RLS policy for the product-images bucket (run in Supabase Dashboard)
-- This allows authenticated users to upload images
/*
CREATE POLICY "Allow authenticated users to upload product images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'product-images' AND 
  auth.role() = 'authenticated'
);

-- This allows public read access to product images
CREATE POLICY "Allow public read access to product images" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');
*/ 