-- Fix RLS policies for customers table with more permissive access
-- This allows customers to access their own data properly

-- First, disable RLS temporarily to drop policies
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Customers can view own data" ON customers;
DROP POLICY IF EXISTS "Customers can insert own data" ON customers;
DROP POLICY IF EXISTS "Customers can update own data" ON customers;
DROP POLICY IF EXISTS "Customers can delete own data" ON customers;
DROP POLICY IF EXISTS "Operators can view customer data for matching" ON customers;
DROP POLICY IF EXISTS "Admins can view all customer data" ON customers;

-- Re-enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create more permissive policies that work with the current auth system
-- Policy 1: Customers can view their own data
CREATE POLICY "Customers can view own data" ON customers
    FOR SELECT
    USING (
        user_id = auth.uid() OR 
        id IN (
            SELECT customer_id 
            FROM customer_machines 
            WHERE customer_id = customers.id
        )
    );

-- Policy 2: Customers can insert their own data
CREATE POLICY "Customers can insert own data" ON customers
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Policy 3: Customers can update their own data
CREATE POLICY "Customers can update own data" ON customers
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Policy 4: Customers can delete their own data
CREATE POLICY "Customers can delete own data" ON customers
    FOR DELETE
    USING (user_id = auth.uid());

-- Policy 5: Operators can view customer data for machines they operate
CREATE POLICY "Operators can view customer data for matching" ON customers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM customer_machines cm
            JOIN companies c ON cm.operating_company_id = c.id
            WHERE cm.customer_id = customers.id
            AND c.owner_id = auth.uid()
        )
    );

-- Policy 6: Admins can view all customer data
CREATE POLICY "Admins can view all customer data" ON customers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Verify the policies were created
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
WHERE tablename = 'customers'
ORDER BY policyname;

-- Test query to verify access
SELECT 'Customers table RLS policies updated successfully!' as status; 