-- Update Machine Templates for Operator Creation
-- Run this in your Supabase SQL Editor

-- Add created_by_company_id column to machine_templates
ALTER TABLE machine_templates 
ADD COLUMN IF NOT EXISTS created_by_company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Update RLS policies to allow operators to create templates
DROP POLICY IF EXISTS "Machine templates can be managed by admins" ON machine_templates;

CREATE POLICY "Machine templates can be managed by admins and creators" ON machine_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        ) OR
        created_by_company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Allow operators to create templates
CREATE POLICY "Operators can create machine templates" ON machine_templates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'operator'
        )
    ); 