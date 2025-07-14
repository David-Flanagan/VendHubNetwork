-- Migration script for adding new sections to existing companies
-- Run this script whenever you add new sections to ensure all companies have them

-- Function to safely add new sections to existing configurations
CREATE OR REPLACE FUNCTION add_missing_sections()
RETURNS void AS $$
BEGIN
  -- Add hero section if missing
  UPDATE companies 
  SET sections_config = sections_config || '{"hero": {"enabled": true, "mandatory": true, "order": 1}}'::jsonb
  WHERE NOT (sections_config ? 'hero');

  -- Add company_info section if missing
  UPDATE companies 
  SET sections_config = sections_config || '{"company_info": {"enabled": true, "mandatory": true, "order": 2}}'::jsonb
  WHERE NOT (sections_config ? 'company_info');

  -- Add location section if missing
  UPDATE companies 
  SET sections_config = sections_config || '{"location": {"enabled": true, "mandatory": true, "order": 3}}'::jsonb
  WHERE NOT (sections_config ? 'location');

  -- Add product_catalog section if missing
  UPDATE companies 
  SET sections_config = sections_config || '{"product_catalog": {"enabled": true, "mandatory": true, "order": 4}}'::jsonb
  WHERE NOT (sections_config ? 'product_catalog');

  -- Add machine_templates section if missing
  UPDATE companies 
  SET sections_config = sections_config || '{"machine_templates": {"enabled": true, "mandatory": true, "order": 5}}'::jsonb
  WHERE NOT (sections_config ? 'machine_templates');

  -- Add machine_gallery section if missing
  UPDATE companies 
  SET sections_config = sections_config || '{"machine_gallery": {"enabled": true, "mandatory": false, "order": 6}}'::jsonb
  WHERE NOT (sections_config ? 'machine_gallery');

  -- Add vendhub_stats section if missing
  UPDATE companies 
  SET sections_config = sections_config || '{"vendhub_stats": {"enabled": false, "mandatory": false, "order": 7}}'::jsonb
  WHERE NOT (sections_config ? 'vendhub_stats');

  -- Reorder sections to ensure proper order
  UPDATE companies 
  SET sections_config = jsonb_build_object(
    'hero', COALESCE(sections_config->'hero', '{"enabled": true, "mandatory": true, "order": 1}'::jsonb),
    'company_info', COALESCE(sections_config->'company_info', '{"enabled": true, "mandatory": true, "order": 2}'::jsonb),
    'location', COALESCE(sections_config->'location', '{"enabled": true, "mandatory": true, "order": 3}'::jsonb),
    'product_catalog', COALESCE(sections_config->'product_catalog', '{"enabled": true, "mandatory": true, "order": 4}'::jsonb),
    'machine_templates', COALESCE(sections_config->'machine_templates', '{"enabled": true, "mandatory": true, "order": 5}'::jsonb),
    'machine_gallery', COALESCE(sections_config->'machine_gallery', '{"enabled": true, "mandatory": false, "order": 6}'::jsonb),
    'vendhub_stats', COALESCE(sections_config->'vendhub_stats', '{"enabled": false, "mandatory": false, "order": 7}'::jsonb)
  )
  WHERE sections_config IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT add_missing_sections();

-- Clean up the function
DROP FUNCTION add_missing_sections();

-- Verify the results
SELECT 
  id,
  name,
  jsonb_object_keys(sections_config) as available_sections
FROM companies 
ORDER BY name; 