# Recent Features & Updates

## January 2025 Updates

### 🤖 Machine Template System Overhaul (3-Table Architecture)
- **Simplified Architecture**: Migrated from 9-table over-engineered system to clean 3-table structure
- **Global Machine Templates**: Admin-managed global catalog of machine types
- **Company Machine Templates**: Operator-customized copies of global templates with complete data storage
- **Customer Machines**: Customer onboarded machines with complete product snapshots and pricing
- **Slot Configuration**: JSON-based structure with rows and slots, each slot having alias, MDB code, and allowed product types
- **Builder Interface**: Visual machine template builder with live preview grid and row-by-row addition
- **Category System**: Machine categories for organization and filtering
- **Public Display**: Available machines shown on public company profiles with category filtering
- **RLS Policies**: Fixed public access for customer viewing while maintaining operator security

### 🛒 Enhanced Product & Machine Filtering System
- **Product Category Filtering**: Added hierarchical filtering with product categories first, then product types
- **Smart Category Display**: Only show product categories that have products available
- **Dynamic Product Types**: Product type filters update based on selected category
- **Machine Category Filtering**: Only show machine categories that have available machines
- **Search Integration**: Text search works across all filters for both products and machines
- **Performance Optimization**: Used `useMemo` to prevent infinite re-render loops
- **Consistent UI**: Same filtering patterns across product catalog and machine templates

### 🗺️ Service Area System Overhaul
- **Polygon-Only System**: Removed radius-based service areas in favor of polygon-only
- **Database Migration**: Cleaned up radius-related columns and data
- **UI Simplification**: Removed method selection, streamlined polygon drawing
- **Type Safety**: Updated TypeScript types to reflect polygon-only approach

### 🔍 Customer Discovery Enhancements
- **Browse Operators Page**: New `/browse-operators` page with location-based search
- **Interactive Maps**: Google Maps integration with service area visualization
- **Distance Calculations**: Show nearby operators in miles (not kilometers)
- **Rich Company Cards**: Display operator credentials and information
- **Navigation Context**: Preserve search results when viewing company profiles
- **Current Location Button**: Added "Use Current Location" button for easier location input

### 🏢 Company Profile Improvements
- **Company Settings Page**: New `/operators/settings` page for business credentials
- **Logo Upload**: Interactive logo upload with drag-and-drop support
- **Logo Display**: Company logos shown in browse operators page and company cards
- **Incorporation Date**: Track company incorporation date for credibility
- **Enhanced Credentials**: Display active machines, VendHub operator since, incorporated since
- **Product Catalog Enhancement**: Improved filtering and display of company products
- **Machine Templates Display**: Better organization and filtering of available machines

### 🎯 UX Improvements
- **Map Marker Interaction**: Click markers to show info windows, buttons to view profiles
- **Back Navigation**: "Back to Search" breadcrumbs and floating return buttons
- **Distance Labels**: Consistent mile-based distance display across all components
- **Loading States**: Improved map loading and error handling
- **Filter Button Styling**: Consistent purple theme for products, orange for machines
- **Empty State Handling**: Better messaging when no products/machines are available

### 🐛 Bug Fixes & Performance
- **Infinite Re-render Fix**: Resolved "Maximum update depth exceeded" error with `useMemo`
- **TypeScript Errors**: Fixed interface conflicts and type mismatches
- **Git Repository Setup**: Properly configured Git repository and pushed to GitHub
- **Code Organization**: Cleaned up component structure and dependencies
- **RLS Policy Fixes**: Fixed public access to company machine templates for customer viewing

## Database Schema Updates

### Machine Template System (3-Table Architecture)
```sql
-- Global machine templates (admin-managed)
CREATE TABLE global_machine_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  dimensions TEXT,
  slot_count INTEGER NOT NULL DEFAULT 0,
  category_id UUID REFERENCES machine_categories(id),
  slot_configuration JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company machine templates (operator-customized copies)
CREATE TABLE company_machine_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  dimensions TEXT,
  slot_count INTEGER NOT NULL DEFAULT 0,
  category_id UUID REFERENCES machine_categories(id),
  slot_configuration JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer machines (onboarded with product snapshots)
CREATE TABLE customer_machines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  machine_template_id UUID REFERENCES company_machine_templates(id),
  name TEXT NOT NULL,
  location TEXT,
  slot_configuration JSONB,
  product_snapshots JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Slot Configuration Structure
```json
{
  "rows": [
    {
      "id": "row-1",
      "name": "Row A",
      "slots": [
        {
          "id": "slot-1",
          "alias": "A1",
          "mdb_code": "A1",
          "allowed_product_types": ["snack", "candy"],
          "current_product": {
            "product_id": "uuid",
            "name": "Product Name",
            "price": 1.50,
            "commission": 0.15
          }
        }
      ]
    }
  ]
}
```

### Companies Table
```sql
-- Added new fields
ALTER TABLE companies ADD COLUMN logo_url TEXT;
ALTER TABLE companies ADD COLUMN incorporated_date DATE;
```

### Service Areas Table
```sql
-- Removed radius-related columns
ALTER TABLE service_areas DROP COLUMN IF EXISTS center_lat;
ALTER TABLE service_areas DROP COLUMN IF EXISTS center_lng;
ALTER TABLE service_areas DROP COLUMN IF EXISTS radius_meters;

-- Updated method constraint
ALTER TABLE service_areas DROP CONSTRAINT IF EXISTS service_areas_method_check;
ALTER TABLE service_areas ADD CONSTRAINT service_areas_method_check CHECK (method = 'polygon');
```

### Product Categories Integration
- **Product Category Filtering**: Enhanced product catalog with category-based filtering
- **Hierarchical Filtering**: Category selection filters available product types
- **Smart Display**: Only show categories and types that have products

## New Components

### Machine Template Builder
- **Location**: `src/app/operators/machine-templates/builder/page.tsx`
- **Purpose**: Visual machine template builder with live preview
- **Features**: Row-by-row addition, slot configuration, category assignment, live preview grid

### Machine Templates Management
- **Location**: `src/app/operators/machine-templates/page.tsx`
- **Purpose**: Manage company machine templates
- **Features**: Add from global catalog, edit templates, category filtering

### Global Machine Templates
- **Location**: `src/app/operators/global-machine-templates/page.tsx`
- **Purpose**: Browse and add global machine templates to company catalog
- **Features**: Search, filtering, add to company catalog

### Admin Machine Templates
- **Location**: `src/app/admin/machine-templates/page.tsx`
- **Purpose**: Admin management of global machine templates
- **Features**: Create, edit, delete global templates, category management

### CustomerMap
- **Location**: `src/components/maps/CustomerMap.tsx`
- **Purpose**: Display customer location, nearby operators, and service areas
- **Features**: Interactive markers, info windows, distance calculations

### Company Settings
- **Location**: `src/app/operators/settings/page.tsx`
- **Purpose**: Business credentials and operational settings
- **Features**: Incorporation date, location management, map toggle

### Browse Operators Page
- **Location**: `src/app/browse-operators/page.tsx`
- **Purpose**: Location-based operator discovery
- **Features**: Search by location, interactive map, company cards, current location button

### Google Maps Debug Component
- **Location**: `src/components/debug/GoogleMapsDebug.tsx`
- **Purpose**: Debug Google Maps loading and configuration issues
- **Features**: API key validation, loading status, error reporting

## Updated Components

### Company Profile Page
- **Location**: `src/app/[company-name]/page.tsx`
- **Enhancements**: 
  - Product category filtering system
  - Machine category filtering
  - Search functionality for both products and machines
  - Performance optimizations with `useMemo`
  - Better error handling and loading states
  - Available machines section with category filtering

### UnifiedLocationManager
- **Changes**: Removed radius support, polygon-only service areas
- **Location**: `src/components/operators/UnifiedLocationManager.tsx`
- **Purpose**: Unified location and service area management

### ServiceAreaManager
- **Changes**: Removed radius method, simplified to polygon-only
- **Location**: `src/components/operators/ServiceAreaManager.tsx`
- **Purpose**: Service area management for operators

### Company Cards (Browse Operators)
- **Changes**: Enhanced with credentials, logo support, action buttons
- **Features**: View Profile, Start Onboarding buttons, distance sorting

## Migration Scripts

### Machine Template System Migration
- **File**: `machine-templates-setup.sql`
- **Purpose**: Set up the new 3-table machine template system
- **Impact**: Clean migration from old 9-table system to new simplified structure

### Fix Company Machine Templates Public Access
- **File**: `fix-company-machine-templates-public-access.sql`
- **Purpose**: Fix RLS policies to allow public read access to active company machine templates
- **Impact**: Customers can now view available machines on public company profiles

### Remove Radius Service Areas
- **File**: `remove-radius-service-areas.sql`
- **Purpose**: Clean up radius-based service areas and update schema
- **Impact**: All radius service areas removed, polygon-only system

### Add Company Credentials
- **File**: `add-incorporated-date.sql`
- **Purpose**: Add logo and incorporation date fields
- **Impact**: Enhanced company profiles with business credentials

### Setup Company Logo Storage
- **File**: `setup-company-logos-bucket.sql`
- **Purpose**: Create storage bucket for company logos
- **Impact**: Secure logo upload and display functionality

## TypeScript Updates

### Machine Template Types
```typescript
interface MachineTemplate {
  id: string
  name: string
  description?: string
  image_url?: string
  dimensions?: string
  slot_count: number
  category_id?: string
  slot_configuration?: SlotConfiguration
  is_active: boolean
  created_at: string
  updated_at: string
}

interface SlotConfiguration {
  rows: SlotRow[]
}

interface SlotRow {
  id: string
  name: string
  slots: Slot[]
}

interface Slot {
  id: string
  alias: string
  mdb_code: string
  allowed_product_types: string[]
  current_product?: ProductSnapshot
}

interface ProductSnapshot {
  product_id: string
  name: string
  price: number
  commission: number
}
```

### Service Area Types
```typescript
// Before: Supported both radius and polygon
export type ServiceAreaMethod = 'radius' | 'polygon'

// After: Polygon-only
export type ServiceAreaMethod = 'polygon'

// Removed radius-related fields from ServiceArea interface
interface ServiceArea {
  // Removed: center_lat, center_lng, radius_meters
  // Kept: polygon_geometry
}
```

### Company Types
```typescript
interface Company {
  // Added fields
  logo_url?: string
  incorporated_date?: string
  // Existing fields remain
}
```

### Product Filtering Types
```typescript
// Enhanced CompanyProduct interface
interface CompanyProduct extends GlobalProduct {
  price: number
  is_available: boolean
  product_category_name?: string
}

// Memoized filtering for performance
const availableProductCategories = useMemo(() => 
  productCategories.filter(category => 
    allProducts.some(product => product.product_category_id === category.id)
  ),
  [productCategories, allProducts]
)
```

## API Changes

### Machine Template Endpoints
- **Global Templates**: Admin CRUD operations for global machine templates
- **Company Templates**: Operator management of company-specific templates
- **Customer Machines**: Customer onboarding with product snapshots
- **Slot Configuration**: JSON-based slot structure management

### Service Area Endpoints
- **Create/Update**: Only accepts polygon geometry
- **Validation**: Enforces polygon-only method
- **Response**: Simplified without radius fields

### Location Search
- **Distance Units**: All distances returned in miles
- **Service Area Matching**: Polygon-based location checking only

### Product Filtering
- **Category-Based**: Filter products by category first, then type
- **Dynamic Types**: Product types filtered based on selected category
- **Performance**: Optimized queries with proper indexing

## UI/UX Improvements

### Machine Template Builder
- **Visual Interface**: Drag-and-drop row addition
- **Live Preview**: Real-time grid preview of slot configuration
- **Category Assignment**: Easy machine category selection
- **Slot Configuration**: Detailed slot setup with product type restrictions

### Map Interactions
- **Marker Clicks**: Show info windows instead of direct navigation
- **Profile Access**: Dedicated "View Company Profile" buttons
- **Loading States**: Better error handling and retry mechanisms
- **Current Location**: One-click location detection for users

### Navigation
- **Breadcrumbs**: "Back to Search" links preserve context
- **URL Parameters**: Search state maintained in URL
- **Floating Buttons**: Quick return to search results

### Company Cards
- **Vertical Layout**: Sorted by distance
- **Rich Information**: Logo, credentials, dates
- **Action Buttons**: Clear call-to-action buttons
- **Distance Display**: Consistent mile-based distances

### Product & Machine Filtering
- **Hierarchical Design**: Category → Type filtering flow
- **Smart Buttons**: Only show relevant filter options
- **Visual Feedback**: Clear active state styling
- **Search Integration**: Text search across all filters

## Performance Improvements

### Database Queries
- **Simplified Schema**: Removed unused radius columns and old machine template tables
- **Index Optimization**: Better geospatial query performance
- **Reduced Complexity**: Polygon-only queries are more efficient
- **Product Filtering**: Optimized category and type filtering
- **Machine Templates**: Efficient 3-table structure with proper indexing

### React Performance
- **useMemo Optimization**: Prevented infinite re-render loops
- **Memoized Filters**: Efficient filtering calculations
- **Component Optimization**: Reduced unnecessary re-renders

### Map Loading
- **Error Handling**: Graceful fallbacks for map loading issues
- **Retry Logic**: Automatic retry for failed map loads
- **Loading States**: Clear feedback during map initialization

## Security Updates

### RLS Policies
- **Machine Templates**: Public read access for active company templates
- **Service Areas**: Updated for polygon-only access patterns
- **Company Data**: Enhanced policies for new credential fields
- **Public Access**: Maintained for location search functionality 