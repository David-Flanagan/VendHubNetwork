-- Fix RLS policy for referral system
-- This allows customers to view machines where they are the referral_user_id

-- Add new RLS policy for customers to view machines where they are the referral user
CREATE POLICY "Customers can view machines where they are referral user" ON customer_machines
    FOR SELECT USING (referral_user_id = auth.uid());

-- Verify the policies exist
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

-- Test the policy by checking what a customer can see
-- (This will show the current user's access)
SELECT 
    'Current user ID:' as info,
    auth.uid() as user_id;

-- Show machines where current user is customer_id
SELECT 
    'Machines where user is customer_id:' as info,
    COUNT(*) as count
FROM customer_machines 
WHERE customer_id = auth.uid();

-- Show machines where current user is referral_user_id  
SELECT 
    'Machines where user is referral_user_id:' as info,
    COUNT(*) as count
FROM customer_machines 
WHERE referral_user_id = auth.uid(); 