-- Fix Machine Template Slots RLS Policies
-- Run this in your Supabase SQL Editor

-- Enable RLS on machine_template_slots if not already enabled
ALTER TABLE machine_template_slots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Machine template slots can be managed by admins" ON machine_template_slots;
DROP POLICY IF EXISTS "Allow authenticated users to manage machine template slots" ON machine_template_slots;

-- Create a simple policy for machine_template_slots
CREATE POLICY "Allow authenticated users to manage machine template slots" ON machine_template_slots
    FOR ALL USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL); 