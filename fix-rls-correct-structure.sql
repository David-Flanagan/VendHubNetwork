-- Fix RLS policies based on actual database structure
-- From the analysis, we can see:
-- - customer_machines.company_id -> companies.id
-- - customer_machines.customer_id -> users.id  
-- - customer_machines.referral_user_id -> users.id
-- - No separate customers table exists

-- First, check if customers table exists and disable RLS if it does
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
        ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on customers table';
    ELSE
        RAISE NOTICE 'Customers table does not exist';
    END IF;
END $$;

-- Now create proper RLS policies for customer_machines table
-- Enable RLS on customer_machines
ALTER TABLE customer_machines ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own machines" ON customer_machines;
DROP POLICY IF EXISTS "Users can view referred machines" ON customer_machines;
DROP POLICY IF EXISTS "Companies can view their machines" ON customer_machines;
DROP POLICY IF EXISTS "Admins can view all machines" ON customer_machines;

-- Policy 1: Users can view machines where they are the customer
CREATE POLICY "Users can view own machines" ON customer_machines
    FOR SELECT
    USING (customer_id = auth.uid());

-- Policy 2: Users can view machines where they are the referrer
CREATE POLICY "Users can view referred machines" ON customer_machines
    FOR SELECT
    USING (referral_user_id = auth.uid());

-- Policy 3: Companies can view machines they operate
CREATE POLICY "Companies can view their machines" ON customer_machines
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM users 
            WHERE users.id = auth.uid() 
            AND users.company_id = customer_machines.company_id
        )
    );

-- Policy 4: Admins can view all machines
CREATE POLICY "Admins can view all machines" ON customer_machines
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'customer_machines'
ORDER BY policyname;

-- Test query to verify access
SELECT 'Customer machines RLS policies updated successfully!' as status; 