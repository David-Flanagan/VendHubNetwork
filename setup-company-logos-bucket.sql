-- Setup Storage Bucket for Company Logos
-- This script creates the company-logos bucket

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  2097152, -- 2MB limit (smaller for logos)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Note: Storage policies need to be created manually through the Supabase dashboard
-- Go to Storage > company-logos > Policies and add the following policies:

/*
1. INSERT Policy: "Authenticated users can upload logos"
   - Operation: INSERT
   - Target roles: authenticated
   - Using expression: bucket_id = 'company-logos' AND auth.role() = 'authenticated'

2. SELECT Policy: "Public can view company logos"  
   - Operation: SELECT
   - Target roles: public
   - Using expression: bucket_id = 'company-logos'

3. UPDATE Policy: "Authenticated users can update logos"
   - Operation: UPDATE
   - Target roles: authenticated
   - Using expression: bucket_id = 'company-logos' AND auth.role() = 'authenticated'

4. DELETE Policy: "Authenticated users can delete logos"
   - Operation: DELETE
   - Target roles: authenticated
   - Using expression: bucket_id = 'company-logos' AND auth.role() = 'authenticated'
*/ 