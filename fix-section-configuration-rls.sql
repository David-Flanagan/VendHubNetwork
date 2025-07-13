-- Check and fix RLS policies for sections_config column
-- This script ensures operators can update their own section configuration

-- First, let's check if the column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name = 'sections_config';

-- Check existing RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'companies';

-- Drop the existing policy if it exists (to recreate it properly)
DROP POLICY IF EXISTS "Companies can update their own section configuration" ON companies;

-- Create a more comprehensive RLS policy for companies table
CREATE POLICY "Companies can update their own data" ON companies
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'operator' 
    AND users.company_id = companies.id
  )
);

-- Also ensure operators can read their own company data
CREATE POLICY "Companies can read their own data" ON companies
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'operator' 
    AND users.company_id = companies.id
  )
);

-- Check if RLS is enabled on companies table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'companies';

-- Enable RLS if not already enabled
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Test the configuration by checking a sample company
SELECT 
  id,
  name,
  sections_config,
  created_at
FROM companies 
LIMIT 1; 