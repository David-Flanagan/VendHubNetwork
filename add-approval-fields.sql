-- Add missing approval fields to customer_machines table
-- This migration adds the referral_commission_percent field needed for the operator approval process

-- Add referral_commission_percent column (nayax_machine_id already exists)
ALTER TABLE customer_machines 
ADD COLUMN IF NOT EXISTS referral_commission_percent DECIMAL(5,2);

-- Add comments for documentation
COMMENT ON COLUMN customer_machines.referral_commission_percent IS 'Commission percentage for referral user (0-100)';

-- Note: nayax_machine_id and approved_by columns already exist in the table
-- The existing RLS policies should already allow operators to update these fields 