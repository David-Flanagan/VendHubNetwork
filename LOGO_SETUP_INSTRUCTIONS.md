# Company Logo Storage Setup Instructions

## Overview

This guide provides step-by-step instructions for setting up the company logo storage bucket and policies in Supabase.

## Step 1: Run the SQL Script

First, run the `setup-company-logos-bucket.sql` script in your Supabase SQL Editor:

```sql
-- This creates the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;
```

## Step 2: Set Up Storage Policies

Navigate to your Supabase dashboard and follow these steps:

### 2.1 Access Storage Settings
1. Go to your Supabase project dashboard
2. Click on "Storage" in the left sidebar
3. Click on the "company-logos" bucket
4. Click on the "Policies" tab

### 2.2 Create INSERT Policy
1. Click "New Policy"
2. Select "INSERT" as the operation
3. Set target roles to "authenticated"
4. Use this expression:
   ```sql
   bucket_id = 'company-logos' AND auth.role() = 'authenticated'
   ```
5. Name: "Authenticated users can upload logos"
6. Click "Review" and then "Save policy"

### 2.3 Create SELECT Policy
1. Click "New Policy"
2. Select "SELECT" as the operation
3. Set target roles to "public"
4. Use this expression:
   ```sql
   bucket_id = 'company-logos'
   ```
5. Name: "Public can view company logos"
6. Click "Review" and then "Save policy"

### 2.4 Create UPDATE Policy
1. Click "New Policy"
2. Select "UPDATE" as the operation
3. Set target roles to "authenticated"
4. Use this expression:
   ```sql
   bucket_id = 'company-logos' AND auth.role() = 'authenticated'
   ```
5. Name: "Authenticated users can update logos"
6. Click "Review" and then "Save policy"

### 2.5 Create DELETE Policy
1. Click "New Policy"
2. Select "DELETE" as the operation
3. Set target roles to "authenticated"
4. Use this expression:
   ```sql
   bucket_id = 'company-logos' AND auth.role() = 'authenticated'
   ```
5. Name: "Authenticated users can delete logos"
6. Click "Review" and then "Save policy"

## Step 3: Verify Setup

### 3.1 Test Bucket Creation
- The "company-logos" bucket should appear in your Storage section
- It should be marked as "Public"
- File size limit should be 2MB

### 3.2 Test Policy Setup
- All 4 policies should be listed under the bucket's Policies tab
- Each policy should show the correct operation and target roles

## Troubleshooting

### Common Issues

#### "must be owner of table objects" Error
- This error occurs when trying to create storage policies via SQL
- **Solution**: Use the Supabase dashboard to create policies manually (as described above)

#### Bucket Not Found
- Ensure the SQL script ran successfully
- Check that the bucket name is exactly "company-logos"
- Verify the bucket appears in the Storage section

#### Upload Permission Denied
- Verify the INSERT policy is created correctly
- Ensure the user is authenticated
- Check that the bucket_id matches exactly

#### Public Access Not Working
- Verify the SELECT policy is set to "public" target roles
- Ensure the bucket is marked as "public"
- Check that the policy expression is correct

## Policy Reference

### INSERT Policy
- **Purpose**: Allow authenticated users to upload logos
- **Target**: authenticated users
- **Expression**: `bucket_id = 'company-logos' AND auth.role() = 'authenticated'`

### SELECT Policy
- **Purpose**: Allow public access to view logos
- **Target**: public
- **Expression**: `bucket_id = 'company-logos'`

### UPDATE Policy
- **Purpose**: Allow authenticated users to update logos
- **Target**: authenticated users
- **Expression**: `bucket_id = 'company-logos' AND auth.role() = 'authenticated'`

### DELETE Policy
- **Purpose**: Allow authenticated users to delete logos
- **Target**: authenticated users
- **Expression**: `bucket_id = 'company-logos' AND auth.role() = 'authenticated'`

## Security Notes

- The bucket is set to public for read access (logos need to be visible to customers)
- Only authenticated users can upload, update, or delete logos
- File size is limited to 2MB to prevent abuse
- Only image formats (JPEG, PNG, WebP) are allowed

## Next Steps

After completing this setup:

1. Test the logo upload functionality in the company settings page
2. Verify logos display correctly in the browse operators page
3. Check that the fallback (company initial) works when no logo is uploaded

---

**Last Updated**: January 2025 