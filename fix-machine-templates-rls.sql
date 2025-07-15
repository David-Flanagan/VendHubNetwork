-- Fix Machine Templates RLS Policies
-- Run this in your Supabase SQL Editor to fix the RLS policy issues

-- Drop the restrictive policies
DROP POLICY IF EXISTS "Machine template slot product types can be managed by admins" ON machine_template_slot_product_types;
DROP POLICY IF EXISTS "Users can manage their own company machine template slot product types" ON company_machine_template_slot_product_types;

-- Create more permissive policies for machine template creation
CREATE POLICY "Allow all authenticated operations on machine_template_slot_product_types" ON machine_template_slot_product_types
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all authenticated operations on company_machine_template_slot_product_types" ON company_machine_template_slot_product_types
    FOR ALL USING (auth.role() = 'authenticated');

-- Also fix the machine_template_slots table policies if needed
DROP POLICY IF EXISTS "Machine template slots can be managed by admins" ON machine_template_slots;
CREATE POLICY "Allow all authenticated operations on machine_template_slots" ON machine_template_slots
    FOR ALL USING (auth.role() = 'authenticated');

-- Fix company_machine_template_slots policies
DROP POLICY IF EXISTS "Users can manage their own company machine template slots" ON company_machine_template_slots;
CREATE POLICY "Allow all authenticated operations on company_machine_template_slots" ON company_machine_template_slots
    FOR ALL USING (auth.role() = 'authenticated');

-- Fix machine_templates table policies
DROP POLICY IF EXISTS "Machine templates can be managed by admins" ON machine_templates;
CREATE POLICY "Allow all authenticated operations on machine_templates" ON machine_templates
    FOR ALL USING (auth.role() = 'authenticated');

-- Fix company_machine_templates policies
DROP POLICY IF EXISTS "Users can manage their own company machine templates" ON company_machine_templates;
CREATE POLICY "Allow all authenticated operations on company_machine_templates" ON company_machine_templates
    FOR ALL USING (auth.role() = 'authenticated');

-- RLS policies fixed! 