-- Fix Company Machine Templates Public Access
-- This script allows public read access to active company machine templates
-- so customers can view available machines on public company profiles

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Allow all authenticated operations on company_machine_templates" ON company_machine_templates;

-- Create a new policy that allows public read access to active templates
CREATE POLICY "Allow public read access to active company machine templates" ON company_machine_templates
    FOR SELECT USING (is_active = true);

-- Create a policy for authenticated users to manage their own company templates
CREATE POLICY "Allow authenticated users to manage their own company machine templates" ON company_machine_templates
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        (
            -- Admins can manage all templates
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() AND users.role = 'admin'
            )
            OR
            -- Operators can manage their own company templates
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role = 'operator' 
                AND users.company_id = company_machine_templates.company_id
            )
        )
    );

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'company_machine_templates'
ORDER BY policyname; 