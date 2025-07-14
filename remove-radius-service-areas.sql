-- Remove radius-related columns from service_areas table
ALTER TABLE service_areas DROP COLUMN IF EXISTS center_lat;
ALTER TABLE service_areas DROP COLUMN IF EXISTS center_lng;
ALTER TABLE service_areas DROP COLUMN IF EXISTS radius_meters;

-- Remove service_area_radius_miles from companies table
ALTER TABLE companies DROP COLUMN IF EXISTS service_area_radius_miles;

-- Update service_areas table to only allow polygon method
-- First, delete any existing radius-based service areas
DELETE FROM service_areas WHERE method = 'radius';

-- Then update the method column to only allow 'polygon'
-- Note: This might require recreating the table or using a more complex migration
-- For now, we'll just ensure all remaining records are polygon-based
UPDATE service_areas SET method = 'polygon' WHERE method != 'polygon';

-- Add a check constraint to ensure only polygon method is allowed
ALTER TABLE service_areas ADD CONSTRAINT check_method_polygon_only CHECK (method = 'polygon'); 