# Service Areas Setup Guide

## Database Setup Required

The service areas feature requires database tables and functions to be created. Follow these steps:

### 1. Run the Database Schema

1. **Go to your Supabase Dashboard**
   - Navigate to your project
   - Go to the **SQL Editor** tab

2. **Run the Service Areas Schema**
   - Copy the contents of `service-areas-schema-fixed.sql`
   - Paste it into the SQL Editor
   - Click **Run** to execute the script

3. **Verify the Setup**
   - Go to **Table Editor**
   - You should see a new `service_areas` table
   - Check that the RLS policies are enabled

### 2. Enable PostGIS Extension

The script will automatically enable PostGIS, but if you get errors:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 3. Test the Setup

After running the schema:

1. **Go to your app**: Edit Profile → Location & Service Area → Manage Service Areas
2. **Try creating a service area**: The map should load and you should be able to create areas
3. **Check the console**: No more 400 errors when saving

## Troubleshooting

### If you get "column user_id does not exist" error:
- Make sure you're using the `service-areas-schema-fixed.sql` file (not the original one)
- The fixed version uses the correct table structure for your setup

### If the map doesn't load:
- Check that your Google Maps API key is set in `.env.local`
- Make sure the key has the Maps JavaScript API enabled
- Check browser console for any errors

### If you get 400 errors when saving:
- The database schema hasn't been created yet
- Run the SQL script in Supabase

## Files Created

- `service-areas-schema-fixed.sql` - Database schema with correct RLS policies
- `src/components/operators/ServiceAreaManager.tsx` - Service area management component
- `src/lib/google-maps-loader.ts` - Google Maps loading utility
- `src/lib/service-area-utils.ts` - Utility functions for service areas
- `src/types/index.ts` - Updated with service area types

## Next Steps

Once the database is set up:

1. **Test the functionality**: Create both radius and polygon service areas
2. **Remove debug component**: The `GoogleMapsDebug` component can be removed after testing
3. **Future customer search**: The system is ready for location-based customer matching 