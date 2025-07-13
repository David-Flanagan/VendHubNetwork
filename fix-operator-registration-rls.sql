-- Fix Operator Registration RLS Issue
-- This script updates the companies table RLS policy to allow authenticated users to create companies during registration

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Companies can be created by operators" ON companies;

-- Create a new policy that allows authenticated users to create companies
-- This is needed for the two-step registration process
CREATE POLICY "Companies can be created by authenticated users" ON companies
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'companies' AND policyname LIKE '%created%'
ORDER BY policyname; 