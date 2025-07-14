-- Service Areas Schema (Fixed for actual database structure)
-- This creates a flexible system for operators to define multiple service areas
-- using either radius-based or polygon-based methods

-- Enable PostGIS extension for geospatial operations
CREATE EXTENSION IF NOT EXISTS postgis;

-- Service Areas table
CREATE TABLE IF NOT EXISTS service_areas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT, -- Optional name for the service area
    method TEXT NOT NULL CHECK (method IN ('radius', 'polygon')),
    
    -- For radius method: center point and radius in meters
    center_lat DECIMAL(10, 8),
    center_lng DECIMAL(11, 8),
    radius_meters INTEGER,
    
    -- For polygon method: GeoJSON polygon
    polygon_geometry GEOMETRY(POLYGON, 4326),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one method is used per service area
    CONSTRAINT valid_method_data CHECK (
        (method = 'radius' AND center_lat IS NOT NULL AND center_lng IS NOT NULL AND radius_meters IS NOT NULL AND polygon_geometry IS NULL) OR
        (method = 'polygon' AND polygon_geometry IS NOT NULL AND center_lat IS NULL AND center_lng IS NULL AND radius_meters IS NULL)
    )
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_service_areas_company_id ON service_areas(company_id);
CREATE INDEX IF NOT EXISTS idx_service_areas_method ON service_areas(method);
CREATE INDEX IF NOT EXISTS idx_service_areas_polygon_geometry ON service_areas USING GIST(polygon_geometry);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_areas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_service_areas_updated_at
    BEFORE UPDATE ON service_areas
    FOR EACH ROW
    EXECUTE FUNCTION update_service_areas_updated_at();

-- Function to check if a point is within any service area of a company
CREATE OR REPLACE FUNCTION is_location_in_service_area(
    company_uuid UUID,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8)
)
RETURNS BOOLEAN AS $$
DECLARE
    service_area_record RECORD;
    point_geometry GEOMETRY;
BEGIN
    -- Create point geometry from lat/lng
    point_geometry := ST_SetSRID(ST_MakePoint(lng, lat), 4326);
    
    -- Check each service area for the company
    FOR service_area_record IN 
        SELECT * FROM service_areas 
        WHERE company_id = company_uuid
    LOOP
        -- Check radius method
        IF service_area_record.method = 'radius' THEN
            IF ST_DWithin(
                point_geometry,
                ST_SetSRID(ST_MakePoint(service_area_record.center_lng, service_area_record.center_lat), 4326),
                service_area_record.radius_meters
            ) THEN
                RETURN TRUE;
            END IF;
        -- Check polygon method
        ELSIF service_area_record.method = 'polygon' THEN
            IF ST_Within(point_geometry, service_area_record.polygon_geometry) THEN
                RETURN TRUE;
            END IF;
        END IF;
    END LOOP;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to get all companies that serve a specific location
CREATE OR REPLACE FUNCTION get_companies_serving_location(
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8)
)
RETURNS TABLE(
    company_id UUID,
    company_name TEXT,
    service_area_id UUID,
    service_area_name TEXT,
    method TEXT
) AS $$
DECLARE
    point_geometry GEOMETRY;
BEGIN
    -- Create point geometry from lat/lng
    point_geometry := ST_SetSRID(ST_MakePoint(lng, lat), 4326);
    
    RETURN QUERY
    SELECT DISTINCT
        sa.company_id,
        c.name as company_name,
        sa.id as service_area_id,
        sa.name as service_area_name,
        sa.method
    FROM service_areas sa
    JOIN companies c ON sa.company_id = c.id
    WHERE 
        -- Check radius method
        (sa.method = 'radius' AND ST_DWithin(
            point_geometry,
            ST_SetSRID(ST_MakePoint(sa.center_lng, sa.center_lat), 4326),
            sa.radius_meters
        ))
        OR
        -- Check polygon method
        (sa.method = 'polygon' AND ST_Within(point_geometry, sa.polygon_geometry));
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for service_areas table
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;

-- Operators can view and manage their own service areas
-- Fixed: Use users table with company_id relationship
CREATE POLICY "Operators can view their own service areas" ON service_areas
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() AND role = 'operator'
        )
    );

CREATE POLICY "Operators can insert their own service areas" ON service_areas
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() AND role = 'operator'
        )
    );

CREATE POLICY "Operators can update their own service areas" ON service_areas
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() AND role = 'operator'
        )
    );

CREATE POLICY "Operators can delete their own service areas" ON service_areas
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() AND role = 'operator'
        )
    );

-- Admins can view all service areas
-- Fixed: Use users table instead of user_roles table
CREATE POLICY "Admins can view all service areas" ON service_areas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Public read access for location queries (needed for customer search)
CREATE POLICY "Public can query service areas for location matching" ON service_areas
    FOR SELECT USING (true);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON service_areas TO authenticated;
GRANT SELECT ON service_areas TO anon; 