-- Simple RLS policies for customers table (no dependency on users table)
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

-- Simple policies that only check user_id (no role checking)
-- Customers can only see their own data
CREATE POLICY "Customers can view own data" ON customers
  FOR SELECT USING (auth.uid() = user_id);

-- Customers can insert their own data
CREATE POLICY "Customers can insert own data" ON customers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Customers can update their own data
CREATE POLICY "Customers can update own data" ON customers
  FOR UPDATE USING (auth.uid() = user_id);

-- Customers can delete their own data
CREATE POLICY "Customers can delete own data" ON customers
  FOR DELETE USING (auth.uid() = user_id);

-- Allow all authenticated users to view customer data (for service area matching)
CREATE POLICY "Authenticated users can view customer data" ON customers
  FOR SELECT USING (auth.role() = 'authenticated'); 