-- Simple Fix for Machine Templates RLS Policies
-- Run this in your Supabase SQL Editor

-- Ensure the column exists
ALTER TABLE machine_templates 
ADD COLUMN IF NOT EXISTS created_by_company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Drop all existing policies on machine_templates
DROP POLICY IF EXISTS "Machine templates can be managed by admins" ON machine_templates;
DROP POLICY IF EXISTS "Machine templates can be managed by admins and creators" ON machine_templates;
DROP POLICY IF EXISTS "Operators can create machine templates" ON machine_templates;
DROP POLICY IF EXISTS "Machine templates comprehensive access" ON machine_templates;

-- Enable RLS
ALTER TABLE machine_templates ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows all operations for authenticated users
-- This is more permissive but will work for now
CREATE POLICY "Allow authenticated users to manage machine templates" ON machine_templates
    FOR ALL USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL); 