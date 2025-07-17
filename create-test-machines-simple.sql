-- Create test machines for referral system testing (Simplified version)
-- This script creates sample machines with different referral scenarios

-- First, let's check what exists in the database
SELECT 'Checking database structure...' as info;

-- Check if companies exist
SELECT 'Companies count:' as info, COUNT(*) as count FROM companies;

-- Check if company_machine_templates exist  
SELECT 'Machine templates count:' as info, COUNT(*) as count FROM company_machine_templates;

-- Check if slot_configuration column exists
SELECT 'Checking if slot_configuration column exists...' as info;
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'customer_machines' 
AND column_name = 'slot_configuration';

-- Create test machines one by one to avoid errors

-- Test Machine 1: Machine with referral_user_id set to the current user
-- This should show in the referrals tab
INSERT INTO customer_machines (
    customer_id,
    company_id,
    host_business_name,
    machine_placement_area,
    host_address,
    host_latitude,
    host_longitude,
    point_of_contact_name,
    point_of_contact_position,
    point_of_contact_email,
    point_of_contact_phone,
    default_commission_rate,
    processing_fee_percentage,
    sales_tax_percentage,
    approval_status,
    onboarding_status,
    current_step,
    referral_user_id,
    referral_commission_percent
) 
SELECT 
    'f3eb4b79-44ba-4255-baf2-b4cc9d611a11', -- Current user ID (referral@vendhub.com)
    c.id, -- Company ID
    'Test Business 1',
    'Break Room',
    '123 Test Street, Test City, TC 12345',
    25.7617,
    -80.1918,
    'John Doe',
    'Manager',
    'john@testbusiness1.com',
    '555-0101',
    15.00,
    3.50,
    7.00,
    'approved',
    'completed',
    5,
    'f3eb4b79-44ba-4255-baf2-b4cc9d611a11', -- This user is the referral
    10.00 -- 10% referral commission
FROM companies c 
LIMIT 1;

-- Test Machine 2: Machine with different referral_user_id (should NOT show in referrals)
INSERT INTO customer_machines (
    customer_id,
    company_id,
    host_business_name,
    machine_placement_area,
    host_address,
    host_latitude,
    host_longitude,
    point_of_contact_name,
    point_of_contact_position,
    point_of_contact_email,
    point_of_contact_phone,
    default_commission_rate,
    processing_fee_percentage,
    sales_tax_percentage,
    approval_status,
    onboarding_status,
    current_step,
    referral_user_id,
    referral_commission_percent
) 
SELECT 
    'f3eb4b79-44ba-4255-baf2-b4cc9d611a11', -- Current user ID
    c.id, -- Company ID
    'Test Business 2',
    'Lobby',
    '456 Another Street, Test City, TC 12345',
    25.7617,
    -80.1918,
    'Jane Smith',
    'Receptionist',
    'jane@testbusiness2.com',
    '555-0102',
    12.00,
    3.50,
    7.00,
    'pending',
    'completed',
    5,
    '00000000-0000-0000-0000-000000000000', -- Different referral user (should not show)
    5.00 -- 5% referral commission
FROM companies c 
LIMIT 1;

-- Test Machine 3: Machine with NO referral_user_id (should NOT show in referrals)
INSERT INTO customer_machines (
    customer_id,
    company_id,
    host_business_name,
    machine_placement_area,
    host_address,
    host_latitude,
    host_longitude,
    point_of_contact_name,
    point_of_contact_position,
    point_of_contact_email,
    point_of_contact_phone,
    default_commission_rate,
    processing_fee_percentage,
    sales_tax_percentage,
    approval_status,
    onboarding_status,
    current_step
) 
SELECT 
    'f3eb4b79-44ba-4255-baf2-b4cc9d611a11', -- Current user ID
    c.id, -- Company ID
    'Test Business 3',
    'Office Area',
    '789 Third Street, Test City, TC 12345',
    25.7617,
    -80.1918,
    'Bob Wilson',
    'Office Manager',
    'bob@testbusiness3.com',
    '555-0103',
    18.00,
    3.50,
    7.00,
    'approved',
    'completed',
    5
FROM companies c 
LIMIT 1;

-- Verify the test data was created
SELECT 'Test machines created successfully!' as info;

SELECT 
    id,
    host_business_name,
    approval_status,
    referral_user_id,
    referral_commission_percent,
    CASE 
        WHEN referral_user_id = 'f3eb4b79-44ba-4255-baf2-b4cc9d611a11' THEN 'SHOULD SHOW IN REFERRALS'
        WHEN referral_user_id IS NULL THEN 'No referral (should NOT show)'
        ELSE 'Different referral (should NOT show)'
    END as referral_status
FROM customer_machines 
WHERE customer_id = 'f3eb4b79-44ba-4255-baf2-b4cc9d611a11'
ORDER BY created_at DESC; 