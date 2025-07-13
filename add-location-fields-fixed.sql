-- Add location and service area fields to companies table (excluding address which already exists)
ALTER TABLE companies 
ADD COLUMN latitude DECIMAL(10,8),
ADD COLUMN longitude DECIMAL(11,8),
ADD COLUMN service_area_radius_miles INTEGER DEFAULT 50,
ADD COLUMN map_enabled BOOLEAN DEFAULT false;

-- Add RLS policies for the new fields
CREATE POLICY "Companies location data is viewable by all authenticated users" ON companies
FOR SELECT USING (auth.role() IN ('authenticated', 'anon'));

CREATE POLICY "Companies can update their own location data" ON companies
FOR UPDATE USING (auth.uid() IN (
  SELECT user_id FROM users WHERE company_id = companies.id
));

-- Add comments for documentation
COMMENT ON COLUMN companies.latitude IS 'Latitude coordinate of company location';
COMMENT ON COLUMN companies.longitude IS 'Longitude coordinate of company location';
COMMENT ON COLUMN companies.service_area_radius_miles IS 'Service area radius in miles from company location';
COMMENT ON COLUMN companies.map_enabled IS 'Whether to show map on company profile page'; 