-- Add Machine Gallery Section to Company Configurations
-- This script adds the machine_gallery section to existing companies' section configurations

-- Update companies that don't have machine_gallery in their sections_config
UPDATE companies 
SET sections_config = CASE 
  WHEN sections_config IS NULL THEN 
    jsonb_build_object(
      'machine_gallery', jsonb_build_object(
        'enabled', true,
        'mandatory', false,
        'order', 6
      )
    )
  ELSE 
    sections_config || jsonb_build_object(
      'machine_gallery', jsonb_build_object(
        'enabled', true,
        'mandatory', false,
        'order', 6
      )
    )
  END
WHERE sections_config IS NULL 
   OR NOT (sections_config ? 'machine_gallery');

-- Verify the changes
SELECT 
  id,
  name,
  sections_config->'machine_gallery' as machine_gallery_config
FROM companies 
WHERE sections_config ? 'machine_gallery'
ORDER BY name; 