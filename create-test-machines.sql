-- Create test machines for referral system testing
-- This script creates sample machines with different referral scenarios

-- First, let's check what companies and users exist
SELECT 'Companies:' as info;
SELECT id, name FROM companies LIMIT 5;

SELECT 'Users:' as info;
SELECT id, email, role FROM users WHERE role IN ('customer', 'operator') LIMIT 10;

-- Create test machines with different scenarios
-- Note: Replace the UUIDs below with actual IDs from your database

-- Test Machine 1: Machine with referral_user_id set to the current user
INSERT INTO customer_machines (
    id,
    customer_id,
    company_id,
    company_machine_template_id,
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
    referral_commission_percent,
    slot_configuration
) VALUES (
    gen_random_uuid(),
    'f3eb4b79-44ba-4255-baf2-b4cc9d611a11', -- Current user ID (referral@vendhub.com)
    (SELECT id FROM companies LIMIT 1), -- First company
    (SELECT id FROM company_machine_templates LIMIT 1), -- First template
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
    10.00, -- 10% referral commission
    '{"slots": [{"row": 1, "slot": 1, "product_name": "Coca Cola", "brand_name": "Coca Cola", "price": 2.50}]}'
);

-- Test Machine 2: Machine with different referral_user_id (should NOT show in referrals)
INSERT INTO customer_machines (
    id,
    customer_id,
    company_id,
    company_machine_template_id,
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
    referral_commission_percent,
    slot_configuration
) VALUES (
    gen_random_uuid(),
    'f3eb4b79-44ba-4255-baf2-b4cc9d611a11', -- Current user ID
    (SELECT id FROM companies LIMIT 1), -- First company
    (SELECT id FROM company_machine_templates LIMIT 1), -- First template
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
    5.00, -- 5% referral commission
    '{"slots": [{"row": 1, "slot": 1, "product_name": "Pepsi", "brand_name": "Pepsi", "price": 2.25}]}'
);

-- Test Machine 3: Machine with NO referral_user_id (should NOT show in referrals)
INSERT INTO customer_machines (
    id,
    customer_id,
    company_id,
    company_machine_template_id,
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
    slot_configuration
) VALUES (
    gen_random_uuid(),
    'f3eb4b79-44ba-4255-baf2-b4cc9d611a11', -- Current user ID
    (SELECT id FROM companies LIMIT 1), -- First company
    (SELECT id FROM company_machine_templates LIMIT 1), -- First template
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
    5,
    '{"slots": [{"row": 1, "slot": 1, "product_name": "Snickers", "brand_name": "Mars", "price": 1.75}]}'
);

-- Verify the test data
SELECT 'Test machines created:' as info;
SELECT 
    id,
    host_business_name,
    approval_status,
    referral_user_id,
    referral_commission_percent,
    CASE 
        WHEN referral_user_id = 'f3eb4b79-44ba-4255-baf2-b4cc9d611a11' THEN 'SHOULD SHOW IN REFERRALS'
        ELSE 'Should NOT show in referrals'
    END as referral_status
FROM customer_machines 
WHERE customer_id = 'f3eb4b79-44ba-4255-baf2-b4cc9d611a11'
ORDER BY created_at DESC; 