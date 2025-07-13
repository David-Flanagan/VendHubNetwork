-- Add section configuration to companies table
-- This allows operators to customize which sections appear on their profile

-- Add section configuration column to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS sections_config JSONB DEFAULT '{
  "company_info": {"enabled": true, "mandatory": true, "order": 1},
  "profile_image": {"enabled": true, "mandatory": true, "order": 2},
  "location": {"enabled": true, "mandatory": true, "order": 3},
  "vendhub_stats": {"enabled": false, "mandatory": false, "order": 4}
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN companies.sections_config IS 'JSON configuration for profile sections - which sections are enabled and their display order';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_sections_config ON companies USING GIN (sections_config);

-- Update existing companies to have default section configuration
UPDATE companies 
SET sections_config = '{
  "company_info": {"enabled": true, "mandatory": true, "order": 1},
  "profile_image": {"enabled": true, "mandatory": true, "order": 2},
  "location": {"enabled": true, "mandatory": true, "order": 3},
  "vendhub_stats": {"enabled": false, "mandatory": false, "order": 4}
}'::jsonb
WHERE sections_config IS NULL;

-- Add RLS policy for section configuration
CREATE POLICY "Companies can update their own section configuration" ON companies
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'operator' 
    AND users.company_id = companies.id
  )
);

-- Verify the changes
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name = 'sections_config'; 