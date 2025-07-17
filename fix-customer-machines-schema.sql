-- Fix customer_machines table schema
-- This migration ensures all required fields exist for the approval process

-- Add nayax_machine_id column if it doesn't exist
ALTER TABLE customer_machines 
ADD COLUMN IF NOT EXISTS nayax_machine_id TEXT;

-- Add referral_commission_percent column if it doesn't exist
ALTER TABLE customer_machines 
ADD COLUMN IF NOT EXISTS referral_commission_percent DECIMAL(5,2);

-- Add approved_by column if it doesn't exist
ALTER TABLE customer_machines 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- Add approved_at column if it doesn't exist
ALTER TABLE customer_machines 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add rejection_reason column if it doesn't exist
ALTER TABLE customer_machines 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add referral_user_id column if it doesn't exist
ALTER TABLE customer_machines 
ADD COLUMN IF NOT EXISTS referral_user_id UUID REFERENCES users(id);

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'customer_machines' 
    AND column_name IN ('nayax_machine_id', 'referral_commission_percent', 'approved_by', 'approved_at', 'rejection_reason', 'referral_user_id')
ORDER BY column_name;

-- Show all columns for verification
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'customer_machines' 
ORDER BY ordinal_position; 