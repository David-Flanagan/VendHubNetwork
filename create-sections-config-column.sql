-- Simple script to add sections_config column to companies table
-- Run this in Supabase SQL Editor

-- Add the sections_config column
ALTER TABLE companies 
ADD COLUMN sections_config JSONB DEFAULT '{
  "company_info": {"enabled": true, "mandatory": true, "order": 1},
  "profile_image": {"enabled": true, "mandatory": true, "order": 2},
  "location": {"enabled": true, "mandatory": true, "order": 3},
  "product_catalog": {"enabled": true, "mandatory": true, "order": 4},
  "machine_templates": {"enabled": true, "mandatory": true, "order": 5},
  "vendhub_stats": {"enabled": false, "mandatory": false, "order": 6}
}'::jsonb;

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name = 'sections_config'; 