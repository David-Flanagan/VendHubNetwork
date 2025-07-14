# VendHub Network - Company Profile System

## Overview
This document outlines the comprehensive company profile system for VendHub Network, including the customizable widget system, drag-and-drop reordering, and all implemented features.

## 🎯 What Was Accomplished

### ✅ Complete Profile System Implementation

1. **Modular Widget System**
   - Drag-and-drop reordering with dnd-kit
   - Auto-saving configuration changes
   - Visual indicators for fixed vs movable sections
   - Collapsible sections for easier reordering

2. **All Profile Sections Implemented**
   - **Hero Section**: Profile image with recommended specs (1200×400px, 3:1 ratio)
   - **Company Information**: Editable company details (fixed position)
   - **Location & Service Areas**: Advanced polygon drawing with Google Maps
   - **Product Catalog**: Product listings with filtering and pricing
   - **Machine Templates**: Machine type showcase with categories
   - **Machine Gallery**: Photo carousel with captions
   - **VendHub Stats**: Network statistics display

3. **Advanced Service Area System**
   - Polygon drawing with Google Maps Drawing Library
   - Multiple service areas per company
   - Radius and polygon methods supported
   - Warehouse location pinning
   - GeoJSON storage in database

4. **Database Architecture**
   - `sections_config` JSONB column for widget configuration
   - `service_areas` table with PostGIS support
   - `machine_gallery` table for photo management
   - Comprehensive RLS policies
   - Migration system for new sections

## 🏗️ How the System Works

### Widget Configuration Structure
```typescript
interface SectionConfig {
  id: string
  enabled: boolean
  mandatory: boolean
  order: number
  fixedPosition?: boolean
}

// Database format
{
  "hero": {"enabled": true, "mandatory": true, "order": 1},
  "company_info": {"enabled": true, "mandatory": true, "order": 2},
  "location": {"enabled": true, "mandatory": true, "order": 3},
  "product_catalog": {"enabled": true, "mandatory": true, "order": 4},
  "machine_templates": {"enabled": true, "mandatory": true, "order": 5},
  "machine_gallery": {"enabled": true, "mandatory": false, "order": 6},
  "vendhub_stats": {"enabled": false, "mandatory": false, "order": 7}
}
```

### Section Types
- **Fixed Sections**: Hero, Company Info (cannot be moved or disabled)
- **Required Sections**: Location, Product Catalog, Machine Templates (can be disabled but are mandatory for new companies)
- **Optional Sections**: Machine Gallery, VendHub Stats (fully customizable)

### Drag-and-Drop System
- Uses `@dnd-kit/core` and `@dnd-kit/sortable`
- Visual drag handles and drop indicators
- Auto-saves order changes to database
- Prevents moving fixed position sections

## 📋 Universal Widget Procedures

### Adding New Widgets/Sections

#### 1. Code Implementation
```typescript
// Add to defaultConfig in edit-profile/page.tsx
const defaultConfig: DatabaseSectionConfig = {
  // ... existing sections
  "your_new_section": { enabled: true, mandatory: false, order: 8 }
}

// Add to renderSectionContent function
const renderSectionContent = (sectionId: string) => {
  switch (sectionId) {
    // ... existing cases
    case 'your_new_section':
      return <YourNewSectionComponent company={company} onUpdate={handleCompanyUpdate} />
  }
}

// Add icon, title, and description functions
const getSectionIcon = (sectionId: string) => {
  switch (sectionId) {
    // ... existing cases
    case 'your_new_section':
      return <YourIcon />
  }
}
```

#### 2. Database Migration
```sql
-- Quick migration for new sections
UPDATE companies 
SET sections_config = sections_config || '{"your_new_section": {"enabled": true, "mandatory": false, "order": 8}}'::jsonb
WHERE NOT (sections_config ? 'your_new_section');

-- Or run the comprehensive migration script
-- File: migrate-new-sections.sql
```

#### 3. Update Default Configuration
```sql
-- Update add-section-configuration.sql for new companies
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS sections_config JSONB DEFAULT '{
  // ... existing sections
  "your_new_section": {"enabled": true, "mandatory": false, "order": 8}
}'::jsonb;
```

### Migration Checklist
- [ ] Add section to `defaultConfig` in edit-profile page
- [ ] Add section to `renderSectionContent` function
- [ ] Add icon, title, and description functions
- [ ] Create section component if needed
- [ ] Update default configuration in SQL files
- [ ] Run migration script for existing companies
- [ ] Test with existing and new companies

## 🗄️ Database Schema

### Companies Table
```sql
ALTER TABLE companies 
ADD COLUMN sections_config JSONB DEFAULT '{
  "hero": {"enabled": true, "mandatory": true, "order": 1},
  "company_info": {"enabled": true, "mandatory": true, "order": 2},
  "location": {"enabled": true, "mandatory": true, "order": 3},
  "product_catalog": {"enabled": true, "mandatory": true, "order": 4},
  "machine_templates": {"enabled": true, "mandatory": true, "order": 5},
  "machine_gallery": {"enabled": true, "mandatory": false, "order": 6},
  "vendhub_stats": {"enabled": false, "mandatory": false, "order": 7}
}'::jsonb;
```

### Service Areas Table
```sql
CREATE TABLE service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('radius', 'polygon')),
  radius_miles DECIMAL(8,2),
  polygon_coordinates JSONB,
  center_lat DECIMAL(10,8),
  center_lng DECIMAL(11,8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Machine Gallery Table
```sql
CREATE TABLE machine_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🎨 UI/UX Features

### Profile Image Specifications
- **Size**: 1200 × 400 pixels (3:1 aspect ratio)
- **Format**: JPG, PNG, or WebP
- **File size**: Maximum 5MB
- **Content**: Company logo, building, or branded imagery

### Service Area Drawing
- Google Maps integration with Drawing Library
- Polygon drawing with click-to-add points
- Radius circle drawing
- Multiple areas per company
- Warehouse location pinning

### Machine Gallery
- Horizontal scrolling carousel
- Image upload with captions
- Drag-and-drop reordering
- Responsive design

## 🔧 Technical Implementation

### File Structure
```
src/
├── app/
│   ├── operators/
│   │   └── edit-profile/
│   │       └── page.tsx              # Main edit profile with drag-drop
│   └── [company-name]/
│       └── page.tsx                  # Public profile display
├── components/
│   ├── profile/
│   │   ├── SortableProfileSection.tsx # Drag-drop wrapper
│   │   ├── CompanyInfoSection.tsx     # Company details
│   │   ├── ProfileImageSection.tsx    # Hero image
│   │   ├── ProductCatalogSection.tsx  # Product listings
│   │   ├── MachineTemplatesSection.tsx # Machine types
│   │   ├── MachineGallerySection.tsx  # Photo gallery
│   │   ├── VendHubStatsSection.tsx    # Statistics
│   │   └── ServiceAreasMap.tsx        # Service areas display
│   └── operators/
│       └── LocationEditor.tsx         # Service area editor
└── lib/
    └── google-maps-loader.ts          # Maps API singleton
```

### Key Dependencies
- `@dnd-kit/core` - Drag and drop functionality
- `@dnd-kit/sortable` - Sortable lists
- `@dnd-kit/utilities` - CSS utilities
- `@googlemaps/js-api-loader` - Google Maps integration

## 🚀 Current Status

### ✅ Fully Implemented Features
1. **Drag-and-Drop Reordering** - All sections can be reordered
2. **Auto-Saving** - Changes save automatically to database
3. **Service Area Drawing** - Polygon and radius methods
4. **Machine Gallery** - Photo upload and display
5. **Universal Widget System** - Easy to add new sections
6. **Migration System** - Automatic updates for existing companies
7. **Responsive Design** - Works on all screen sizes
8. **Toast Notifications** - User feedback for all actions

### 📊 Section Status
- ✅ **Hero** - Profile image with specs
- ✅ **Company Info** - Editable details (fixed)
- ✅ **Location** - Service areas with drawing
- ✅ **Product Catalog** - Product listings
- ✅ **Machine Templates** - Machine types
- ✅ **Machine Gallery** - Photo carousel
- ✅ **VendHub Stats** - Statistics display

## 🔄 Migration System

### For New Sections
Run `migrate-new-sections.sql` to automatically add missing sections to all existing companies.

### For New Companies
The default configuration in `add-section-configuration.sql` ensures new companies get all sections.

### Quick Migration Command
```sql
-- Add a single new section
UPDATE companies 
SET sections_config = sections_config || '{"new_section": {"enabled": true, "mandatory": false, "order": 8}}'::jsonb
WHERE NOT (sections_config ? 'new_section');
```

## 🧪 Testing

### Test Scenarios
1. **Drag-and-Drop**: Reorder sections and verify persistence
2. **Section Toggles**: Enable/disable optional sections
3. **Service Areas**: Draw polygons and radius circles
4. **Machine Gallery**: Upload photos and add captions
5. **Migration**: Verify existing companies get new sections
6. **New Companies**: Ensure default configuration works

### Test Commands
```sql
-- Check section configuration
SELECT name, sections_config FROM companies ORDER BY name;

-- Check service areas
SELECT company_id, name, method FROM service_areas;

-- Check machine gallery
SELECT company_id, caption, order_index FROM machine_gallery ORDER BY order_index;
```

## 📝 Notes

- **Fixed Sections**: Hero and Company Info cannot be moved or disabled
- **Required Sections**: Can be disabled but are mandatory for new companies
- **Optional Sections**: Fully customizable (enable/disable/reorder)
- **Migration**: Always run migration scripts when adding new sections
- **Testing**: Test with both existing and new companies

---

**Last Updated**: December 2024
**Status**: Complete and Production Ready
**Next Steps**: Add new sections as needed using the migration system 