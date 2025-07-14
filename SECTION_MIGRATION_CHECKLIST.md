# Section Migration Checklist

When adding new profile sections/widgets to VendHub Network, follow this checklist to ensure all companies get the new features:

## 1. Add the Section to the Code

- [ ] Add the section to the `defaultConfig` in `src/app/operators/edit-profile/page.tsx`
- [ ] Add the section to the `renderSectionContent` function
- [ ] Add the section to the `getSectionIcon`, `getSectionTitle`, and `getSectionDescription` functions
- [ ] Create the section component if it doesn't exist

## 2. Update Database Configuration

- [ ] Update the default configuration in `add-section-configuration.sql`
- [ ] Run the `migrate-new-sections.sql` script in Supabase to update existing companies

## 3. Test the Migration

- [ ] Check that existing companies show the new section
- [ ] Verify that new companies get the section by default
- [ ] Test that the section can be enabled/disabled properly

## Quick Migration Command

When you add a new section, just run this in your Supabase SQL editor:

```sql
-- Add your new section to existing companies
UPDATE companies 
SET sections_config = sections_config || '{"your_new_section": {"enabled": true, "mandatory": false, "order": 8}}'::jsonb
WHERE NOT (sections_config ? 'your_new_section');
```

## Current Sections

1. `hero` - Profile image (fixed, order 1)
2. `company_info` - Company details (fixed, order 2)
3. `location` - Service areas (required, order 3)
4. `product_catalog` - Product listings (required, order 4)
5. `machine_templates` - Machine types (required, order 5)
6. `machine_gallery` - Machine photos (optional, order 6)
7. `vendhub_stats` - Statistics (optional, order 7)

## Notes

- Fixed sections (`hero`, `company_info`) cannot be moved or disabled
- Required sections can be disabled but are mandatory for new companies
- Optional sections can be enabled/disabled freely
- Order numbers should be sequential and unique 