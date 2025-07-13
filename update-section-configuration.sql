-- Update section configuration to include hero and company_info sections
-- This migration updates existing companies to have the new section structure

UPDATE companies 
SET sections_config = CASE 
  -- If sections_config is NULL or empty, set the new default
  WHEN sections_config IS NULL OR sections_config = '{}'::jsonb THEN 
    '{
      "hero": {"enabled": true, "mandatory": true, "order": 1},
      "company_info": {"enabled": true, "mandatory": true, "order": 2},
      "location": {"enabled": true, "mandatory": true, "order": 3},
      "product_catalog": {"enabled": true, "mandatory": true, "order": 4},
      "machine_templates": {"enabled": true, "mandatory": true, "order": 5},
      "vendhub_stats": {"enabled": false, "mandatory": false, "order": 6}
    }'::jsonb
  
  -- If sections_config exists, migrate the old structure to new
  ELSE 
    jsonb_build_object(
      'hero', jsonb_build_object('enabled', true, 'mandatory', true, 'order', 1),
      'company_info', jsonb_build_object('enabled', true, 'mandatory', true, 'order', 2),
      'location', COALESCE(sections_config->'location', '{"enabled": true, "mandatory": true, "order": 3}'::jsonb),
      'product_catalog', COALESCE(sections_config->'product_catalog', '{"enabled": true, "mandatory": true, "order": 4}'::jsonb),
      'machine_templates', COALESCE(sections_config->'machine_templates', '{"enabled": true, "mandatory": true, "order": 5}'::jsonb),
      'vendhub_stats', COALESCE(sections_config->'vendhub_stats', '{"enabled": false, "mandatory": false, "order": 6}'::jsonb)
    )
END
WHERE sections_config IS NOT NULL;

-- Update the order numbers to ensure they're sequential
UPDATE companies 
SET sections_config = (
  SELECT jsonb_object_agg(
    key, 
    CASE 
      WHEN key = 'hero' THEN value || '{"order": 1}'::jsonb
      WHEN key = 'company_info' THEN value || '{"order": 2}'::jsonb
      WHEN key = 'location' THEN value || '{"order": 3}'::jsonb
      WHEN key = 'product_catalog' THEN value || '{"order": 4}'::jsonb
      WHEN key = 'machine_templates' THEN value || '{"order": 5}'::jsonb
      WHEN key = 'vendhub_stats' THEN value || '{"order": 6}'::jsonb
      ELSE value
    END
  )
  FROM jsonb_each(sections_config)
)
WHERE sections_config IS NOT NULL;

-- Add updated_at timestamp
UPDATE companies 
SET updated_at = NOW() 
WHERE sections_config IS NOT NULL; 