-- Fix RLS policies for customers table to work with users table
-- Drop existing policies first
DROP POLICY IF EXISTS "Customers can view own data" ON customers;
DROP POLICY IF EXISTS "Customers can insert own data" ON customers;
DROP POLICY IF EXISTS "Customers can update own data" ON customers;
DROP POLICY IF EXISTS "Customers can delete own data" ON customers;
DROP POLICY IF EXISTS "Operators can view customer data for matching" ON customers;
DROP POLICY IF EXISTS "Admins can view all customer data" ON customers;

-- Recreate policies using the users table instead of auth.users
-- Customers can only see their own data
CREATE POLICY "Customers can view own data" ON customers
  FOR SELECT USING (
    auth.uid() = user_id AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'customer'
    )
  );

-- Customers can insert their own data
CREATE POLICY "Customers can insert own data" ON customers
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'customer'
    )
  );

-- Customers can update their own data
CREATE POLICY "Customers can update own data" ON customers
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'customer'
    )
  );

-- Customers can delete their own data
CREATE POLICY "Customers can delete own data" ON customers
  FOR DELETE USING (
    auth.uid() = user_id AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'customer'
    )
  );

-- Operators can view customer data for service area matching
CREATE POLICY "Operators can view customer data for matching" ON customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'operator'
    )
  );

-- Admins can view all customer data
CREATE POLICY "Admins can view all customer data" ON customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  ); 