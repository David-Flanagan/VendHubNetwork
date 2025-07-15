-- Fix Companies Table Public Access for Onboarding
-- This script adds a policy to allow public read access to companies for the onboarding process
-- Run this in your Supabase SQL Editor

-- Enable RLS on companies table if not already enabled
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Add policy for public read access to companies (for onboarding)
CREATE POLICY "Companies can be viewed publicly for onboarding" ON companies
    FOR SELECT USING (true);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'companies'
ORDER BY policyname;

-- Test the policies by checking if they exist
SELECT COUNT(*) as policy_count FROM pg_policies WHERE tablename = 'companies'; 