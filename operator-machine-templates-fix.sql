-- Fix Machine Templates RLS Policies for Operator Creation
-- Run this in your Supabase SQL Editor

-- First, ensure the column exists
ALTER TABLE machine_templates 
ADD COLUMN IF NOT EXISTS created_by_company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Machine templates can be managed by admins" ON machine_templates;
DROP POLICY IF EXISTS "Machine templates can be managed by admins and creators" ON machine_templates;
DROP POLICY IF EXISTS "Operators can create machine templates" ON machine_templates;

-- Create comprehensive policy for all operations
CREATE POLICY "Machine templates comprehensive access" ON machine_templates
    FOR ALL USING (
        -- Admins can access all templates
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        ) OR
        -- Operators can access templates they created
        created_by_company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        -- For INSERT operations
        CASE 
            -- Admins can insert any template
            WHEN EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND role = 'admin'
            ) THEN true
            -- Operators can insert templates for their company
            WHEN EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND role = 'operator'
                AND created_by_company_id = (
                    SELECT company_id FROM users 
                    WHERE id = auth.uid()
                )
            ) THEN true
            ELSE false
        END
    ); 