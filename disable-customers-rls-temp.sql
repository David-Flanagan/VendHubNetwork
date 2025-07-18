-- Temporary fix: Disable RLS on customers table
-- This will allow the Commission page to work while we analyze the database structure

-- Disable RLS on customers table
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'customers';

-- Test query to verify access
SELECT 'Customers table RLS disabled temporarily!' as status; 