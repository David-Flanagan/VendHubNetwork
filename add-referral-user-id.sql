-- Add referral_user_id column to customer_machines table
ALTER TABLE customer_machines 
ADD COLUMN IF NOT EXISTS referral_user_id UUID REFERENCES users(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_customer_machines_referral_user_id ON customer_machines(referral_user_id);

-- Add comment for documentation
COMMENT ON COLUMN customer_machines.referral_user_id IS 'Optional reference to the sales agent or referral user who brought in this customer'; 