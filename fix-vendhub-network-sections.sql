-- Fix sections configuration for VendHub Network company
-- This script updates the sections_config to include all available sections

UPDATE companies 
SET sections_config = '{
  "hero": {"enabled": true, "mandatory": true, "order": 1},
  "company_info": {"enabled": true, "mandatory": true, "order": 2},
  "location": {"enabled": true, "mandatory": true, "order": 3},
  "product_catalog": {"enabled": true, "mandatory": true, "order": 4},
  "machine_templates": {"enabled": true, "mandatory": true, "order": 5},
  "machine_gallery": {"enabled": true, "mandatory": false, "order": 6},
  "vendhub_stats": {"enabled": false, "mandatory": false, "order": 7}
}'::jsonb
WHERE name = 'VendHub Network';

-- Also update any other companies that might be missing sections
UPDATE companies 
SET sections_config = '{
  "hero": {"enabled": true, "mandatory": true, "order": 1},
  "company_info": {"enabled": true, "mandatory": true, "order": 2},
  "location": {"enabled": true, "mandatory": true, "order": 3},
  "product_catalog": {"enabled": true, "mandatory": true, "order": 4},
  "machine_templates": {"enabled": true, "mandatory": true, "order": 5},
  "machine_gallery": {"enabled": true, "mandatory": false, "order": 6},
  "vendhub_stats": {"enabled": false, "mandatory": false, "order": 7}
}'::jsonb
WHERE sections_config IS NULL 
   OR NOT (sections_config ? 'product_catalog' AND sections_config ? 'machine_templates' AND sections_config ? 'machine_gallery');

-- Verify the changes
SELECT 
  id,
  name,
  sections_config
FROM companies 
WHERE name = 'VendHub Network'
ORDER BY name; 