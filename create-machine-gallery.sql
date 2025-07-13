-- Create machine gallery table for operators to showcase their installations
CREATE TABLE IF NOT EXISTS company_machine_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_machine_gallery_company_id ON company_machine_gallery(company_id);
CREATE INDEX IF NOT EXISTS idx_company_machine_gallery_display_order ON company_machine_gallery(display_order);
CREATE INDEX IF NOT EXISTS idx_company_machine_gallery_active ON company_machine_gallery(is_active);

-- Add RLS policies
ALTER TABLE company_machine_gallery ENABLE ROW LEVEL SECURITY;

-- Companies can manage their own gallery images
CREATE POLICY "Companies can manage their own gallery images" ON company_machine_gallery
  FOR ALL USING (company_id IN (
    SELECT id FROM companies WHERE id = company_id
  ));

-- Anyone can view active gallery images
CREATE POLICY "Anyone can view active gallery images" ON company_machine_gallery
  FOR SELECT USING (is_active = true);

-- Add the new section to existing companies' section configuration
UPDATE companies 
SET sections_config = sections_config || 
  '{"machine_gallery": {"enabled": false, "mandatory": false, "order": 7}}'::jsonb
WHERE sections_config IS NOT NULL;

-- Update companies without section config
UPDATE companies 
SET sections_config = '{
  "hero": {"enabled": true, "mandatory": true, "order": 1},
  "company_info": {"enabled": true, "mandatory": true, "order": 2},
  "location": {"enabled": true, "mandatory": true, "order": 3},
  "product_catalog": {"enabled": true, "mandatory": true, "order": 4},
  "machine_templates": {"enabled": true, "mandatory": true, "order": 5},
  "vendhub_stats": {"enabled": false, "mandatory": false, "order": 6},
  "machine_gallery": {"enabled": false, "mandatory": false, "order": 7}
}'::jsonb
WHERE sections_config IS NULL;

-- Add updated_at timestamp
UPDATE companies 
SET updated_at = NOW() 
WHERE sections_config IS NOT NULL; 