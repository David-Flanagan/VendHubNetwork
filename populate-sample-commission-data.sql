-- Sample Commission Data Population
-- This script creates sample commission earnings, cashouts, and payouts for testing

-- First, let's get some existing customer and company IDs
DO $$
DECLARE
    sample_customer_id UUID;
    sample_company_id UUID;
    sample_machine_id UUID;
BEGIN
    -- Get a sample customer
    SELECT id INTO sample_customer_id FROM customers LIMIT 1;
    
    -- Get a sample company
    SELECT id INTO sample_company_id FROM companies LIMIT 1;
    
    -- Get a sample machine
    SELECT id INTO sample_machine_id FROM customer_machines LIMIT 1;
    
    -- Only proceed if we have the required data
    IF sample_customer_id IS NOT NULL AND sample_company_id IS NOT NULL AND sample_machine_id IS NOT NULL THEN
        
        -- Insert sample commission earnings
        INSERT INTO commission_earnings (
            customer_id,
            operator_company_id,
            customer_machine_id,
            transaction_id,
            transaction_date,
            commission_type,
            base_amount,
            commission_percentage,
            commission_amount,
            product_name,
            quantity,
            status
        ) VALUES
        -- Owner commission earnings
        (sample_customer_id, sample_company_id, sample_machine_id, 'TXN001', NOW() - INTERVAL '1 day', 'owner', 2.50, 20.00, 0.50, 'Coca-Cola 12oz', 1, 'earned'),
        (sample_customer_id, sample_company_id, sample_machine_id, 'TXN002', NOW() - INTERVAL '2 days', 'owner', 1.75, 20.00, 0.35, 'Snickers Bar', 1, 'earned'),
        (sample_customer_id, sample_company_id, sample_machine_id, 'TXN003', NOW() - INTERVAL '3 days', 'owner', 3.00, 20.00, 0.60, 'Doritos Nacho', 1, 'earned'),
        (sample_customer_id, sample_company_id, sample_machine_id, 'TXN004', NOW() - INTERVAL '4 days', 'owner', 2.25, 20.00, 0.45, 'Pepsi 12oz', 1, 'earned'),
        (sample_customer_id, sample_company_id, sample_machine_id, 'TXN005', NOW() - INTERVAL '5 days', 'owner', 1.50, 20.00, 0.30, 'M&M Peanut', 1, 'earned'),
        
        -- Referral commission earnings
        (sample_customer_id, sample_company_id, sample_machine_id, 'TXN006', NOW() - INTERVAL '1 day', 'referral', 2.50, 5.00, 0.125, 'Coca-Cola 12oz', 1, 'earned'),
        (sample_customer_id, sample_company_id, sample_machine_id, 'TXN007', NOW() - INTERVAL '2 days', 'referral', 1.75, 5.00, 0.0875, 'Snickers Bar', 1, 'earned'),
        (sample_customer_id, sample_company_id, sample_machine_id, 'TXN008', NOW() - INTERVAL '3 days', 'referral', 3.00, 5.00, 0.15, 'Doritos Nacho', 1, 'earned'),
        (sample_customer_id, sample_company_id, sample_machine_id, 'TXN009', NOW() - INTERVAL '4 days', 'referral', 2.25, 5.00, 0.1125, 'Pepsi 12oz', 1, 'earned'),
        (sample_customer_id, sample_company_id, sample_machine_id, 'TXN010', NOW() - INTERVAL '5 days', 'referral', 1.50, 5.00, 0.075, 'M&M Peanut', 1, 'earned');
        
        -- Insert sample cashout requests
        INSERT INTO commission_cashouts (
            customer_id,
            total_amount,
            requested_amount,
            minimum_cashout_amount,
            status,
            customer_notes,
            created_at
        ) VALUES
        (sample_customer_id, 2.50, 50.00, 50.00, 'pending', 'Monthly cashout request', NOW() - INTERVAL '2 days'),
        (sample_customer_id, 2.50, 75.00, 50.00, 'approved', 'Quarterly cashout', NOW() - INTERVAL '10 days'),
        (sample_customer_id, 2.50, 100.00, 50.00, 'paid', 'Year-end cashout', NOW() - INTERVAL '30 days');
        
        -- Insert sample payouts
        INSERT INTO commission_payouts (
            cashout_id,
            customer_id,
            operator_company_id,
            amount,
            payment_method,
            payment_reference,
            payment_date,
            status
        )
        SELECT 
            cc.id,
            sample_customer_id,
            sample_company_id,
            cc.requested_amount,
            'check',
            'CHK-' || EXTRACT(YEAR FROM cc.created_at) || '-' || LPAD(EXTRACT(MONTH FROM cc.created_at)::TEXT, 2, '0') || '-' || LPAD(EXTRACT(DAY FROM cc.created_at)::TEXT, 2, '0'),
            cc.created_at + INTERVAL '3 days',
            'completed'
        FROM commission_cashouts cc
        WHERE cc.status = 'paid';
        
        RAISE NOTICE 'Sample commission data created successfully for customer %', sample_customer_id;
    ELSE
        RAISE NOTICE 'Required sample data not found. Please ensure you have customers, companies, and machines in the database.';
    END IF;
END $$; 