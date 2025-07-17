-- Step 1: Create the main table
CREATE TABLE IF NOT EXISTS nayax_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id BIGINT UNIQUE NOT NULL,
    machine_id BIGINT NOT NULL,
    customer_machine_id UUID REFERENCES customer_machines(id),
    company_id UUID REFERENCES companies(id),
    
    -- Structured fields
    product_name TEXT,
    mdb_code TEXT,
    authorization_value DECIMAL(10,2),
    settlement_value DECIMAL(10,2),
    currency_code TEXT DEFAULT 'USD',
    payment_method TEXT,
    card_brand TEXT,
    payment_service_provider TEXT,
    transaction_status TEXT,
    multivend_transaction BOOLEAN DEFAULT FALSE,
    multivend_products_count INTEGER DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    
    -- Timestamps
    authorization_datetime TIMESTAMPTZ,
    settlement_datetime TIMESTAMPTZ,
    machine_authorization_time TIMESTAMPTZ,
    
    -- Metadata
    site_id INTEGER,
    site_name TEXT,
    machine_name TEXT,
    machine_number TEXT,
    
    -- Raw data
    raw_data JSONB,
    
    -- Sync metadata
    sync_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create basic indexes
CREATE INDEX IF NOT EXISTS idx_nayax_transactions_machine_id ON nayax_transactions(machine_id);
CREATE INDEX IF NOT EXISTS idx_nayax_transactions_customer_machine_id ON nayax_transactions(customer_machine_id);
CREATE INDEX IF NOT EXISTS idx_nayax_transactions_company_id ON nayax_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_nayax_transactions_transaction_id ON nayax_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_nayax_transactions_authorization_datetime ON nayax_transactions(authorization_datetime);

-- Step 3: Enable RLS
ALTER TABLE nayax_transactions ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
CREATE POLICY "Operators can view their company transactions" ON nayax_transactions
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Customers can view their machine transactions" ON nayax_transactions
    FOR SELECT USING (
        customer_machine_id IN (
            SELECT id FROM customer_machines 
            WHERE customer_id = auth.uid() OR referral_user_id = auth.uid()
        )
    );

-- Step 5: Create trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 6: Create trigger
CREATE TRIGGER update_nayax_transactions_updated_at 
    BEFORE UPDATE ON nayax_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Nayax transactions table created successfully!' as status; 