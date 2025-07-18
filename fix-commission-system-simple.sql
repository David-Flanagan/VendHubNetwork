-- Simple commission system setup
-- This script creates the commission tables without any complex syntax

-- Step 1: Drop existing commission tables if they exist
DROP TABLE IF EXISTS commission_payouts CASCADE;
DROP TABLE IF EXISTS commission_cashouts CASCADE;
DROP TABLE IF EXISTS commission_earnings CASCADE;

-- Step 2: Create commission_earnings table
CREATE TABLE commission_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operator_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_machine_id UUID NOT NULL REFERENCES customer_machines(id) ON DELETE CASCADE,
  
  -- Transaction Details
  transaction_id VARCHAR(255) NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  commission_type VARCHAR(20) NOT NULL CHECK (commission_type IN ('owner', 'referral')),
  
  -- Commission Details
  base_amount DECIMAL(10,2) NOT NULL,
  commission_percentage DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'earned' CHECK (status IN ('earned', 'pending_cashout', 'paid')),
  cashout_id UUID,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create commission_cashouts table
CREATE TABLE commission_cashouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Cashout Details
  total_amount DECIMAL(10,2) NOT NULL,
  requested_amount DECIMAL(10,2) NOT NULL,
  minimum_cashout_amount DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  
  -- Payment Details
  payment_method VARCHAR(100),
  payment_reference VARCHAR(255),
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_by UUID REFERENCES users(id),
  
  -- Notes
  customer_notes TEXT,
  operator_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create commission_payouts table
CREATE TABLE commission_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cashout_id UUID NOT NULL REFERENCES commission_cashouts(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operator_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Payment Details
  payment_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  payment_reference VARCHAR(255),
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create indexes
CREATE INDEX idx_commission_earnings_customer_id ON commission_earnings(customer_id);
CREATE INDEX idx_commission_earnings_operator_company_id ON commission_earnings(operator_company_id);
CREATE INDEX idx_commission_earnings_transaction_date ON commission_earnings(transaction_date);
CREATE INDEX idx_commission_earnings_status ON commission_earnings(status);

CREATE INDEX idx_commission_cashouts_customer_id ON commission_cashouts(customer_id);
CREATE INDEX idx_commission_cashouts_status ON commission_cashouts(status);
CREATE INDEX idx_commission_cashouts_created_at ON commission_cashouts(created_at);

CREATE INDEX idx_commission_payouts_customer_id ON commission_payouts(customer_id);
CREATE INDEX idx_commission_payouts_operator_company_id ON commission_payouts(operator_company_id);
CREATE INDEX idx_commission_payouts_payment_date ON commission_payouts(payment_date);

-- Step 6: Disable RLS temporarily
ALTER TABLE commission_earnings DISABLE ROW LEVEL SECURITY;
ALTER TABLE commission_cashouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payouts DISABLE ROW LEVEL SECURITY;

-- Step 7: Grant permissions
GRANT ALL ON commission_earnings TO authenticated;
GRANT ALL ON commission_cashouts TO authenticated;
GRANT ALL ON commission_payouts TO authenticated;

-- Step 8: Create simple RLS policies
CREATE POLICY "Customers can view their own commission earnings" ON commission_earnings
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Customers can view their own cashouts" ON commission_cashouts
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Customers can create their own cashouts" ON commission_cashouts
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can view their own payouts" ON commission_payouts
  FOR SELECT USING (customer_id = auth.uid());

-- Step 9: Enable RLS
ALTER TABLE commission_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_cashouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payouts ENABLE ROW LEVEL SECURITY;

-- Step 10: Create a simple function to populate commission records from existing transactions
-- (This will be called manually when needed)
CREATE OR REPLACE FUNCTION populate_commission_from_transactions()
RETURNS INTEGER AS $$
DECLARE
    transaction_count INTEGER := 0;
    transaction_record RECORD;
BEGIN
    -- Loop through existing nayax transactions
    FOR transaction_record IN 
        SELECT 
            nt.transaction_id,
            nt.authorization_datetime,
            nt.authorization_value,
            nt.product_name,
            cm.id as customer_machine_id,
            cm.customer_id,
            cm.company_id as operator_company_id,
            cm.referral_user_id,
            cm.referral_commission_percent
        FROM nayax_transactions nt
        JOIN customer_machines cm ON nt.customer_machine_id = cm.id
        WHERE NOT EXISTS (
            SELECT 1 FROM commission_earnings ce 
            WHERE ce.transaction_id = nt.transaction_id
        )
        AND nt.authorization_datetime >= NOW() - INTERVAL '30 days'
    LOOP
        -- Insert commission record for machine owner (5% default)
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
        ) VALUES (
            transaction_record.customer_id,
            transaction_record.operator_company_id,
            transaction_record.customer_machine_id,
            transaction_record.transaction_id,
            transaction_record.authorization_datetime,
            'owner',
            transaction_record.authorization_value,
            5.0,
            (transaction_record.authorization_value * 5.0) / 100,
            COALESCE(transaction_record.product_name, 'Unknown Product'),
            1,
            'earned'
        );
        
        transaction_count := transaction_count + 1;
        
        -- If there's a referral user, create referral commission
        IF transaction_record.referral_user_id IS NOT NULL AND transaction_record.referral_commission_percent IS NOT NULL THEN
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
            ) VALUES (
                transaction_record.referral_user_id,
                transaction_record.operator_company_id,
                transaction_record.customer_machine_id,
                transaction_record.transaction_id,
                transaction_record.transaction_date,
                'referral',
                transaction_record.total_amount,
                transaction_record.referral_commission_percent,
                (transaction_record.total_amount * transaction_record.referral_commission_percent) / 100,
                COALESCE(transaction_record.product_name, 'Unknown Product'),
                1,
                'earned'
            );
            
            transaction_count := transaction_count + 1;
        END IF;
    END LOOP;
    
    RETURN transaction_count;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Commission tables created successfully! Use SELECT populate_commission_from_transactions(); to populate from existing transactions.' as status; 