-- Fix Storage Bucket Permissions for Machine Images
-- Run this in your Supabase SQL Editor

-- Check if the machine-images bucket exists
-- If it doesn't exist, you'll need to create it in the Storage section of your Supabase dashboard

-- Create storage policy for machine-images bucket
-- This allows authenticated users to upload and view images
INSERT INTO storage.buckets (id, name, public)
VALUES ('machine-images', 'machine-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies on machine-images bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload machine images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view machine images" ON storage.objects;

-- Create policy for uploading images
CREATE POLICY "Allow authenticated users to upload machine images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'machine-images' 
        AND auth.uid() IS NOT NULL
    );

-- Create policy for viewing images
CREATE POLICY "Allow public to view machine images" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'machine-images'
    );

-- Create policy for updating images (in case of edits)
CREATE POLICY "Allow authenticated users to update machine images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'machine-images' 
        AND auth.uid() IS NOT NULL
    );

-- Create policy for deleting images
CREATE POLICY "Allow authenticated users to delete machine images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'machine-images' 
        AND auth.uid() IS NOT NULL
    ); 