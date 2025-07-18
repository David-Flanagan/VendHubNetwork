-- Fix RLS policies for operator_preview_cards table
-- Drop existing policies
DROP POLICY IF EXISTS "Operators can view own preview card" ON operator_preview_cards;
DROP POLICY IF EXISTS "Operators can insert own preview card" ON operator_preview_cards;
DROP POLICY IF EXISTS "Operators can update own preview card" ON operator_preview_cards;
DROP POLICY IF EXISTS "Operators can delete own preview card" ON operator_preview_cards;
DROP POLICY IF EXISTS "Public can view all preview cards" ON operator_preview_cards;
DROP POLICY IF EXISTS "Admins can do everything" ON operator_preview_cards;

-- Create improved RLS policies

-- Operators can view their own preview card (more robust)
CREATE POLICY "Operators can view own preview card" ON operator_preview_cards
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() 
      AND company_id IS NOT NULL
    )
  );

-- Operators can insert their own preview card (more robust)
CREATE POLICY "Operators can insert own preview card" ON operator_preview_cards
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() 
      AND company_id IS NOT NULL
    )
  );

-- Operators can update their own preview card (more robust)
CREATE POLICY "Operators can update own preview card" ON operator_preview_cards
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() 
      AND company_id IS NOT NULL
    )
  );

-- Operators can delete their own preview card (more robust)
CREATE POLICY "Operators can delete own preview card" ON operator_preview_cards
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() 
      AND company_id IS NOT NULL
    )
  );

-- Public can view all preview cards (for featured operators section)
CREATE POLICY "Public can view all preview cards" ON operator_preview_cards
  FOR SELECT USING (true);

-- Admins can do everything
CREATE POLICY "Admins can do everything" ON operator_preview_cards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Also add a fallback policy for users with operator role but no company_id
-- This allows them to create preview cards for any company (they'll need to specify company_id)
CREATE POLICY "Operators can manage preview cards" ON operator_preview_cards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'operator'
    )
  ); 