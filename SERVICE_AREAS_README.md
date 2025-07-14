# Service Areas System

## Overview

The Service Areas system allows vending operators to define multiple service areas using polygon-based methods. This enables precise control over where they provide services and supports efficient location-based customer matching.

## Features

- **Multiple Service Areas**: Operators can create multiple service areas per company
- **Polygon-Only System**: Support for custom polygon-based service areas
- **Optional Naming**: Service areas can be optionally named for better organization
- **Google Maps Integration**: Visual polygon drawing and editing using Google Maps Drawing Library
- **Efficient Queries**: PostGIS-powered geospatial queries for fast location matching
- **Location-Based Search**: Built-in functions for customer location search functionality
- **Interactive Maps**: Real-time service area visualization

## Database Schema

### Service Areas Table

```sql
CREATE TABLE service_areas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT, -- Optional name for the service area
    method TEXT NOT NULL DEFAULT 'polygon' CHECK (method = 'polygon'),
    
    -- Polygon method: GeoJSON polygon
    polygon_geometry GEOMETRY(POLYGON, 4326),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Key Constraints

- Only polygon method is supported
- Polygon method requires valid GeoJSON polygon geometry
- PostGIS extension enabled for geospatial operations

## Database Functions

### Location Checking Functions

1. **`is_location_in_service_area(company_uuid, lat, lng)`**
   - Returns boolean indicating if a location is within any service area of a company
   - Checks polygon method only

2. **`get_companies_serving_location(lat, lng)`**
   - Returns all companies that serve a specific location
   - Useful for customer search functionality
   - Returns company details and service area information

## Usage

### For Operators

1. **Access Service Areas**: Go to Edit Profile → Location & Service Area → Manage Service Areas
2. **Create Service Area**: Click "Add Service Area"
3. **Draw Polygon**: Use the map drawing tools to create a custom polygon
4. **Optional Naming**: Add a name to identify the service area
5. **Save**: The service area will be created and displayed on the map

### For Developers

#### TypeScript Types

```typescript
export type ServiceAreaMethod = 'polygon'

export interface ServiceArea {
  id: string
  company_id: string
  name?: string
  method: ServiceAreaMethod
  
  // For polygon method
  polygon_geometry?: GeoJSONPolygon
  
  created_at: string
  updated_at: string
}
```

#### Utility Functions

```typescript
// Check if location is in company service area
const isInServiceArea = await isLocationInCompanyServiceArea(companyId, lat, lng)

// Get all companies serving a location
const companies = await getCompaniesServingLocation(lat, lng)

// Get company's service areas
const serviceAreas = await getCompanyServiceAreas(companyId)

// Create new service area
const newArea = await createServiceArea(companyId, serviceAreaData)

// Update service area
const updatedArea = await updateServiceArea(areaId, updateData)

// Delete service area
const success = await deleteServiceArea(areaId)
```

## Components

### ServiceAreaManager

The main component for managing service areas. Features:
- List of existing service areas
- Create/edit/delete functionality
- Google Maps integration for polygon drawing
- Form validation and error handling
- Real-time map updates

### UnifiedLocationManager

The unified location management component includes:
- Warehouse location management
- Service area management integration
- Google Maps integration
- Form validation and error handling

### CustomerMap

Component for displaying service areas to customers:
- Interactive map with company locations
- Service area visualization
- Distance calculations in miles
- Company information display

## Customer Search Implementation

The system supports location-based customer search:

```typescript
// Example customer search implementation
export async function findOperatorsForLocation(lat: number, lng: number) {
  const companies = await getCompaniesServingLocation(lat, lng)
  
  // Additional filtering/ranking can be applied here
  return companies.map(company => ({
    id: company.company_id,
    name: company.company_name,
    serviceArea: {
      id: company.service_area_id,
      name: company.service_area_name,
      method: company.method
    }
  }))
}
```

## Setup Requirements

1. **PostGIS Extension**: Must be enabled in Supabase
2. **Google Maps API Key**: Required for map functionality
3. **Database Migration**: Run the service-areas-schema-fixed.sql script
4. **RLS Policies**: Already configured for proper access control

## Security

- Row Level Security (RLS) enabled
- Operators can only manage their own service areas
- Public read access for location queries (needed for customer search)
- Admin access for all service areas

## Performance Considerations

- Geospatial indexes on polygon_geometry for fast queries
- Efficient PostGIS functions for location checking
- Proper indexing on company_id and method columns
- Connection pooling for database queries

## Error Handling

- Comprehensive error handling in utility functions
- User-friendly error messages via toast notifications
- Validation of polygon coordinates
- Graceful fallbacks for missing data

## Testing

The system includes validation for:
- Polygon coordinate ranges (-180 to 180 for longitude, -90 to 90 for latitude)
- Minimum polygon complexity (at least 3 points)
- Closed polygons (first and last points must match)
- Method-specific data requirements

## Migration from Radius System

The system has been migrated from supporting both radius and polygon methods to polygon-only:

1. **Data Migration**: All radius-based service areas have been removed
2. **Schema Update**: Removed radius-related columns (center_lat, center_lng, radius_meters)
3. **UI Updates**: Removed radius method selection and input fields
4. **Type Updates**: Updated TypeScript types to reflect polygon-only system

## Future Enhancements

- **Service Area Templates**: Predefined service area shapes
- **Advanced Analytics**: Service area coverage analysis
- **Overlap Detection**: Identify overlapping service areas
- **Optimization Tools**: Suggest optimal service area shapes 