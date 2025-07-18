-- Commission Tracking System Migration
-- Copy and paste this entire script into your Supabase SQL Editor and run it

-- Commission Earnings Table
CREATE TABLE IF NOT EXISTS commission_earnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    operator_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_machine_id UUID NOT NULL REFERENCES customer_machines(id) ON DELETE CASCADE,
    transaction_id VARCHAR(255) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    commission_type VARCHAR(50) NOT NULL CHECK (commission_type IN ('owner', 'referral')),
    base_amount DECIMAL(10,2) NOT NULL,
    commission_percentage DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'earned' CHECK (status IN ('earned', 'pending_cashout', 'paid')),
    cashout_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commission Cashouts Table
CREATE TABLE IF NOT EXISTS commission_cashouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2) NOT NULL,
    requested_amount DECIMAL(10,2) NOT NULL,
    minimum_cashout_amount DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    paid_at TIMESTAMP WITH TIME ZONE,
    paid_by UUID REFERENCES users(id),
    customer_notes TEXT,
    operator_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commission Payouts Table
CREATE TABLE IF NOT EXISTS commission_payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cashout_id UUID NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    operator_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_reference VARCHAR(255),
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints after tables are created
ALTER TABLE commission_earnings ADD CONSTRAINT IF NOT EXISTS fk_commission_earnings_cashout_id 
    FOREIGN KEY (cashout_id) REFERENCES commission_cashouts(id) ON DELETE SET NULL;

ALTER TABLE commission_payouts ADD CONSTRAINT IF NOT EXISTS fk_commission_payouts_cashout_id 
    FOREIGN KEY (cashout_id) REFERENCES commission_cashouts(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_commission_earnings_customer_id ON commission_earnings(customer_id);
CREATE INDEX IF NOT EXISTS idx_commission_earnings_operator_company_id ON commission_earnings(operator_company_id);
CREATE INDEX IF NOT EXISTS idx_commission_earnings_status ON commission_earnings(status);
CREATE INDEX IF NOT EXISTS idx_commission_earnings_transaction_date ON commission_earnings(transaction_date);
CREATE INDEX IF NOT EXISTS idx_commission_earnings_cashout_id ON commission_earnings(cashout_id);

CREATE INDEX IF NOT EXISTS idx_commission_cashouts_customer_id ON commission_cashouts(customer_id);
CREATE INDEX IF NOT EXISTS idx_commission_cashouts_status ON commission_cashouts(status);
CREATE INDEX IF NOT EXISTS idx_commission_cashouts_created_at ON commission_cashouts(created_at);

CREATE INDEX IF NOT EXISTS idx_commission_payouts_cashout_id ON commission_payouts(cashout_id);
CREATE INDEX IF NOT EXISTS idx_commission_payouts_customer_id ON commission_payouts(customer_id);
CREATE INDEX IF NOT EXISTS idx_commission_payouts_operator_company_id ON commission_payouts(operator_company_id);

-- Enable RLS
ALTER TABLE commission_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_cashouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for commission_earnings
CREATE POLICY "Customers can view own commission earnings" ON commission_earnings
    FOR SELECT USING (
        customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Operators can view company commission earnings" ON commission_earnings
    FOR SELECT USING (
        operator_company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid() AND role = 'operator'
        )
    );

-- RLS Policies for commission_cashouts
CREATE POLICY "Customers can view own cashouts" ON commission_cashouts
    FOR SELECT USING (
        customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Customers can create cashout requests" ON commission_cashouts
    FOR INSERT WITH CHECK (
        customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Customers can update own cashout requests" ON commission_cashouts
    FOR UPDATE USING (
        customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Operators can view related cashouts" ON commission_cashouts
    FOR SELECT USING (
        customer_id IN (
            SELECT DISTINCT customer_id FROM customer_machines WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid() AND role = 'operator'
            )
        )
    );

-- RLS Policies for commission_payouts
CREATE POLICY "Customers can view own payouts" ON commission_payouts
    FOR SELECT USING (
        customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Operators can view company payouts" ON commission_payouts
    FOR SELECT USING (
        operator_company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid() AND role = 'operator'
        )
    );

CREATE POLICY "Operators can create payouts" ON commission_payouts
    FOR INSERT WITH CHECK (
        operator_company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid() AND role = 'operator'
        )
    );

-- Create update function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_commission_earnings_updated_at BEFORE UPDATE ON commission_earnings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commission_cashouts_updated_at BEFORE UPDATE ON commission_cashouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commission_payouts_updated_at BEFORE UPDATE ON commission_payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Commission tables created successfully!' as status; 