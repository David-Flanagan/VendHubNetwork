-- Update existing companies to include Product Catalog and Machine Templates sections
-- Run this in Supabase SQL Editor after running create-sections-config-column.sql

-- First, check if the column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name = 'sections_config'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE companies 
        ADD COLUMN sections_config JSONB DEFAULT '{
          "company_info": {"enabled": true, "mandatory": true, "order": 1},
          "profile_image": {"enabled": true, "mandatory": true, "order": 2},
          "location": {"enabled": true, "mandatory": true, "order": 3},
          "product_catalog": {"enabled": true, "mandatory": true, "order": 4},
          "machine_templates": {"enabled": true, "mandatory": true, "order": 5},
          "vendhub_stats": {"enabled": false, "mandatory": false, "order": 6}
        }'::jsonb;
    END IF;
END $$;

-- Update all existing companies to have the complete sections configuration
UPDATE companies 
SET sections_config = '{
  "company_info": {"enabled": true, "mandatory": true, "order": 1},
  "profile_image": {"enabled": true, "mandatory": true, "order": 2},
  "location": {"enabled": true, "mandatory": true, "order": 3},
  "product_catalog": {"enabled": true, "mandatory": true, "order": 4},
  "machine_templates": {"enabled": true, "mandatory": true, "order": 5},
  "vendhub_stats": {"enabled": false, "mandatory": false, "order": 6}
}'::jsonb
WHERE sections_config IS NULL 
   OR sections_config = '{}'::jsonb
   OR NOT (sections_config ? 'product_catalog' AND sections_config ? 'machine_templates');

-- Verify the update
SELECT 
  id, 
  name, 
  sections_config 
FROM companies 
LIMIT 5; 