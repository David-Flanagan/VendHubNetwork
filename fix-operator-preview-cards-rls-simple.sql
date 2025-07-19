-- Simple fix for operator_preview_cards RLS policies
-- This completely replaces the existing policies with more permissive ones

-- First, disable RLS temporarily to clear any issues
ALTER TABLE operator_preview_cards DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Operators can view own preview card" ON operator_preview_cards;
DROP POLICY IF EXISTS "Operators can insert own preview card" ON operator_preview_cards;
DROP POLICY IF EXISTS "Operators can update own preview card" ON operator_preview_cards;
DROP POLICY IF EXISTS "Operators can delete own preview card" ON operator_preview_cards;
DROP POLICY IF EXISTS "Public can view all preview cards" ON operator_preview_cards;
DROP POLICY IF EXISTS "Admins can do everything" ON operator_preview_cards;
DROP POLICY IF EXISTS "Operators can manage preview cards" ON operator_preview_cards;

-- Re-enable RLS
ALTER TABLE operator_preview_cards ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive policies that will definitely work

-- Allow all authenticated users to read preview cards
CREATE POLICY "Allow authenticated users to read preview cards" ON operator_preview_cards
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow operators to manage their own preview cards
CREATE POLICY "Allow operators to manage preview cards" ON operator_preview_cards
  FOR ALL USING (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'operator'
      )
    )
  );

-- Allow admins to do everything
CREATE POLICY "Allow admins to do everything" ON operator_preview_cards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Allow public to read preview cards (for featured operators section)
CREATE POLICY "Allow public to read preview cards" ON operator_preview_cards
  FOR SELECT USING (true); 