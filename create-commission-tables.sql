-- Commission Tracking System
-- This creates tables to track commission earnings, cashouts, and payouts

-- Commission Earnings Table
-- Tracks all commission earned from both owned machines and referral machines
CREATE TABLE IF NOT EXISTS commission_earnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    operator_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_machine_id UUID NOT NULL REFERENCES customer_machines(id) ON DELETE CASCADE,
    transaction_id VARCHAR(255) NOT NULL, -- Nayax transaction ID
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Commission Details
    commission_type VARCHAR(50) NOT NULL CHECK (commission_type IN ('owner', 'referral')), -- owner = machine owner, referral = referral commission
    base_amount DECIMAL(10,2) NOT NULL, -- Base price of the product
    commission_percentage DECIMAL(5,2) NOT NULL, -- Commission percentage
    commission_amount DECIMAL(10,2) NOT NULL, -- Actual commission earned
    
    -- Product Details
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'earned' CHECK (status IN ('earned', 'pending_cashout', 'paid')),
    cashout_id UUID REFERENCES commission_cashouts(id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commission Cashouts Table
-- Tracks cashout requests from customers
CREATE TABLE IF NOT EXISTS commission_cashouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Cashout Details
    total_amount DECIMAL(10,2) NOT NULL,
    requested_amount DECIMAL(10,2) NOT NULL,
    minimum_cashout_amount DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    
    -- Payment Details
    payment_method VARCHAR(50), -- 'check', 'bank_transfer', 'paypal', etc.
    payment_reference VARCHAR(255), -- Check number, transaction ID, etc.
    paid_at TIMESTAMP WITH TIME ZONE,
    paid_by UUID REFERENCES users(id),
    
    -- Notes
    customer_notes TEXT,
    operator_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commission Payouts Table
-- Tracks actual payments made to customers
CREATE TABLE IF NOT EXISTS commission_payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cashout_id UUID NOT NULL REFERENCES commission_cashouts(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    operator_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Payment Details
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_reference VARCHAR(255),
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
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

-- RLS Policies for commission_earnings
ALTER TABLE commission_earnings ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own commission earnings
CREATE POLICY "Customers can view own commission earnings" ON commission_earnings
    FOR SELECT USING (
        customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    );

-- Operators can only see commission earnings for their company
CREATE POLICY "Operators can view company commission earnings" ON commission_earnings
    FOR SELECT USING (
        operator_company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid() AND role = 'operator'
        )
    );

-- RLS Policies for commission_cashouts
ALTER TABLE commission_cashouts ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own cashouts
CREATE POLICY "Customers can view own cashouts" ON commission_cashouts
    FOR SELECT USING (
        customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    );

-- Customers can insert their own cashout requests
CREATE POLICY "Customers can create cashout requests" ON commission_cashouts
    FOR INSERT WITH CHECK (
        customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    );

-- Customers can update their own cashout requests (for notes)
CREATE POLICY "Customers can update own cashout requests" ON commission_cashouts
    FOR UPDATE USING (
        customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    );

-- Operators can view cashouts for customers with their machines
CREATE POLICY "Operators can view related cashouts" ON commission_cashouts
    FOR SELECT USING (
        customer_id IN (
            SELECT DISTINCT customer_id FROM customer_machines WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid() AND role = 'operator'
            )
        )
    );

-- RLS Policies for commission_payouts
ALTER TABLE commission_payouts ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own payouts
CREATE POLICY "Customers can view own payouts" ON commission_payouts
    FOR SELECT USING (
        customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    );

-- Operators can only see payouts for their company
CREATE POLICY "Operators can view company payouts" ON commission_payouts
    FOR SELECT USING (
        operator_company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid() AND role = 'operator'
        )
    );

-- Operators can create payouts for their company
CREATE POLICY "Operators can create payouts" ON commission_payouts
    FOR INSERT WITH CHECK (
        operator_company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid() AND role = 'operator'
        )
    );

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_commission_earnings_updated_at BEFORE UPDATE ON commission_earnings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commission_cashouts_updated_at BEFORE UPDATE ON commission_cashouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commission_payouts_updated_at BEFORE UPDATE ON commission_payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 