-- Setup Machine Templates Storage Bucket
-- This script creates the storage bucket for machine template images

-- Create the machine-templates bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'machine-templates',
  'machine-templates',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the machine-templates bucket
-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload machine template images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'machine-templates' AND
    auth.role() = 'authenticated'
  );

-- Allow public read access to machine template images
CREATE POLICY "Allow public read access to machine template images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'machine-templates'
  );

-- Allow authenticated users to update their own machine template images
CREATE POLICY "Allow authenticated users to update machine template images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'machine-templates' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete their own machine template images
CREATE POLICY "Allow authenticated users to delete machine template images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'machine-templates' AND
    auth.role() = 'authenticated'
  );

-- Verify bucket creation
SELECT 'Machine templates storage bucket created successfully!' as status; 