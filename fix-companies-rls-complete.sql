-- Complete Companies Table RLS Fix
-- This script adds all necessary RLS policies for operators to manage their company information
-- Run this in your Supabase SQL Editor

-- Enable RLS on companies table if not already enabled
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on companies table to avoid conflicts
DROP POLICY IF EXISTS "Companies can be viewed by all authenticated users" ON companies;
DROP POLICY IF EXISTS "Companies can be updated by their operators" ON companies;
DROP POLICY IF EXISTS "Companies can be created by operators" ON companies;
DROP POLICY IF EXISTS "Companies can be managed by admins" ON companies;
DROP POLICY IF EXISTS "Companies location data is viewable by all authenticated users" ON companies;
DROP POLICY IF EXISTS "Companies can update their own location data" ON companies;

-- Policy for viewing companies (public read access for authenticated users)
CREATE POLICY "Companies can be viewed by all authenticated users" ON companies
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policy for operators to update their own company (includes all fields)
CREATE POLICY "Companies can be updated by their operators" ON companies
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'operator' 
            AND users.company_id = companies.id
        )
    );

-- Policy for operators to create their company (during registration)
CREATE POLICY "Companies can be created by operators" ON companies
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'operator'
        )
    );

-- Policy for admins to manage all companies
CREATE POLICY "Companies can be managed by admins" ON companies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'companies'
ORDER BY policyname;

-- Test the policies by checking if they exist
SELECT COUNT(*) as policy_count FROM pg_policies WHERE tablename = 'companies'; 