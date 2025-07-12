-- Comprehensive RLS Fix for Machine Templates
-- Run this in your Supabase SQL Editor

-- 1. Fix machine_templates table
ALTER TABLE machine_templates 
ADD COLUMN IF NOT EXISTS created_by_company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Drop ALL existing policies on machine_templates
DROP POLICY IF EXISTS "Machine templates can be managed by admins" ON machine_templates;
DROP POLICY IF EXISTS "Machine templates can be managed by admins and creators" ON machine_templates;
DROP POLICY IF EXISTS "Operators can create machine templates" ON machine_templates;
DROP POLICY IF EXISTS "Machine templates comprehensive access" ON machine_templates;
DROP POLICY IF EXISTS "Allow authenticated users to manage machine templates" ON machine_templates;

-- Disable RLS temporarily to clear any issues
ALTER TABLE machine_templates DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE machine_templates ENABLE ROW LEVEL SECURITY;

-- Create a very permissive policy for now
CREATE POLICY "Allow all authenticated operations on machine_templates" ON machine_templates
    FOR ALL USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Fix machine_template_slots table
-- Drop ALL existing policies on machine_template_slots
DROP POLICY IF EXISTS "Machine template slots can be managed by admins" ON machine_template_slots;
DROP POLICY IF EXISTS "Allow authenticated users to manage machine template slots" ON machine_template_slots;

-- Disable RLS temporarily
ALTER TABLE machine_template_slots DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE machine_template_slots ENABLE ROW LEVEL SECURITY;

-- Create a very permissive policy for now
CREATE POLICY "Allow all authenticated operations on machine_template_slots" ON machine_template_slots
    FOR ALL USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Check and fix company_machine_templates table if it exists
-- Drop ALL existing policies on company_machine_templates
DROP POLICY IF EXISTS "Company machine templates can be managed by company users" ON company_machine_templates;
DROP POLICY IF EXISTS "Allow authenticated users to manage company machine templates" ON company_machine_templates;

-- Disable RLS temporarily
ALTER TABLE company_machine_templates DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE company_machine_templates ENABLE ROW LEVEL SECURITY;

-- Create a very permissive policy for now
CREATE POLICY "Allow all authenticated operations on company_machine_templates" ON company_machine_templates
    FOR ALL USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Verify the tables exist and have the right structure
-- This will show any errors if tables don't exist
SELECT 'machine_templates' as table_name, COUNT(*) as row_count FROM machine_templates LIMIT 1;
SELECT 'machine_template_slots' as table_name, COUNT(*) as row_count FROM machine_template_slots LIMIT 1;
SELECT 'company_machine_templates' as table_name, COUNT(*) as row_count FROM company_machine_templates LIMIT 1; 