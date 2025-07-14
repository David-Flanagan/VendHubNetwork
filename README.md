# VendHub Network

A comprehensive vending operator-customer relations portal built with Next.js, React, TypeScript, and Supabase.

## 🎯 Overview

VendHub Network connects host locations with vending machine operators, enabling operators to showcase their services, products, and machines while allowing customers to browse and connect with operators in their area.

## ✨ Key Features

### 🏢 Complete Company Profile System
- **Drag-and-Drop Reordering**: Customize profile section order
- **Modular Widget System**: Easy to add new sections
- **Service Area Drawing**: Advanced polygon-based mapping
- **Machine Gallery**: Photo carousel with captions
- **Product Catalog**: Comprehensive product management
- **Machine Templates**: Organized machine type showcase
- **Company Settings**: Business credentials and operational settings

### 🔐 Authentication & Authorization
- **Role-Based Access**: Admin, Operator, Customer roles
- **Company Association**: Operators linked to companies
- **Route Protection**: Automatic redirects based on role
- **Secure File Uploads**: Validated image uploads

### 🗺️ Advanced Service Areas
- **Google Maps Integration**: Drawing Library for polygon creation
- **Polygon-Only System**: Precise custom polygon service areas
- **Warehouse Pinning**: Company location markers
- **GeoJSON Storage**: Efficient spatial data storage
- **Location-Based Search**: Find operators by proximity

### 📦 Product Management
- **Global Product Catalog**: Admin-managed product database
- **Company Catalogs**: Operators add products to their catalog
- **Product Types**: Categorized products (snacks, drinks, etc.)
- **Dynamic Pricing**: Company-specific pricing

### 🔍 Customer Discovery
- **Browse Operators Page**: Location-based search with interactive map
- **Distance Calculation**: Show nearby operators in miles
- **Service Area Visualization**: See operator coverage areas
- **Company Cards**: Rich operator information display
- **Navigation Context**: Preserve search results when viewing profiles

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Google Maps API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vendhub-network
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

4. **Database Setup**
   Run the SQL scripts in your Supabase dashboard:
   - `supabase-setup.sql` - Core database setup
   - `add-section-configuration.sql` - Profile system setup
   - `service-areas-schema-fixed.sql` - Service area system (polygon-only)
   - `add-incorporated-date.sql` - Company business credentials
   - `remove-radius-service-areas.sql` - Clean up radius data
   - `setup-company-logos-bucket.sql` - Company logo storage setup (requires manual policy setup)

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## 🏗️ Architecture

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context
- **Drag & Drop**: @dnd-kit

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Maps**: Google Maps API

### Key Components
```
src/
├── app/                    # Next.js App Router pages
│   ├── operators/         # Operator-specific pages
│   │   ├── dashboard/     # Operator dashboard
│   │   ├── edit-profile/  # Profile customization
│   │   └── settings/      # Company settings
│   ├── admin/            # Admin panel
│   ├── customers/        # Customer pages
│   ├── browse-operators/ # Operator discovery
│   └── [company-name]/   # Public company profiles
├── components/           # Reusable components
│   ├── profile/         # Profile section components
│   ├── auth/           # Authentication components
│   ├── operators/      # Operator-specific components
│   └── maps/          # Map components
├── contexts/           # React contexts
├── lib/               # Utility functions
└── types/             # TypeScript type definitions
```

## 📊 Database Schema

### Core Tables
- `users` - User accounts and roles
- `companies` - Company information, profile config, and business credentials
- `global_products` - Admin-managed product catalog
- `company_products` - Company-specific product catalogs
- `machine_templates` - Predefined machine types
- `service_areas` - Company service coverage areas (polygon-only)
- `machine_gallery` - Company machine photos

### Updated Company Table Structure
```sql
companies (
  id, name, description, address, latitude, longitude,
  map_enabled, sections_config, profile_image_url,
  logo_url, incorporated_date, created_at, updated_at
)
```

### Service Areas (Polygon-Only)
```sql
service_areas (
  id, company_id, name, method, polygon_geometry,
  created_at, updated_at
)
```

### Profile System
Companies use a `sections_config` JSONB column to store widget configuration:
```json
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

## 🔧 Development

### Adding New Profile Sections
1. Add section to `defaultConfig` in edit-profile page
2. Add section to `renderSectionContent` function
3. Create section component if needed
4. Update default configuration in SQL files
5. Run migration script for existing companies

### Migration System
Use `migrate-new-sections.sql` to automatically add missing sections to all existing companies.

### Service Area System
- **Polygon-Only**: All service areas use custom polygon drawing
- **Google Maps Drawing Library**: Interactive polygon creation
- **GeoJSON Storage**: Efficient spatial data format
- **Location Search**: Find operators within service areas

### Code Standards
- **TypeScript**: Strict typing throughout
- **React Best Practices**: Functional components, hooks
- **Error Handling**: Comprehensive error states
- **Testing**: Manual testing of all features

## 📝 Documentation

- `CUSTOMIZABLE_PROFILE_SYSTEM.md` - Complete profile system documentation
- `DEVELOPMENT_RULES.md` - Development guidelines
- `SECTION_MIGRATION_CHECKLIST.md` - Widget addition procedures
- `PROJECT_ANALYSIS.md` - Detailed project analysis
- `SERVICE_AREAS_README.md` - Service area system documentation

## 🎨 UI/UX Features

### Design System
- Modern card-based layout
- Responsive design
- Toast notifications
- Loading states
- Error handling

### Profile Customization
- Drag-and-drop reordering
- Toggle switches for optional sections
- Collapsible interface
- Auto-saving configuration

### Customer Discovery
- Location-based operator search
- Interactive maps with service areas
- Distance-based sorting
- Rich company cards with credentials
- Seamless navigation between search and profiles

### Image Management
- Profile images (1200×400px, 3:1 ratio)
- Company logos
- Machine gallery carousel
- Drag-and-drop uploads
- Organized storage buckets

## 🔒 Security

- **Row Level Security**: Database-level protection
- **Role-based Access**: User permission system
- **File Upload Security**: Validated image uploads
- **API Protection**: Authenticated endpoints

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Other Platforms
- Netlify
- Railway
- DigitalOcean App Platform

## 🤝 Contributing

1. Follow the development rules in `DEVELOPMENT_RULES.md`
2. Always discuss changes before implementing
3. Test thoroughly with existing and new companies
4. Update documentation for any new features

## 📄 License

This project is proprietary software.

---

**Last Updated**: January 2025
**Status**: Production Ready
