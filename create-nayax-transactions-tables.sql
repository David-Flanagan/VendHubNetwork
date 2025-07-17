-- Create Nayax Transactions Table (Single Hybrid Table)
-- This migration sets up storage for both processed data and raw API data in one table

-- Single table with structured fields + JSONB backup
CREATE TABLE IF NOT EXISTS nayax_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id BIGINT UNIQUE NOT NULL, -- Nayax TransactionID for deduplication
    machine_id BIGINT NOT NULL, -- Nayax MachineID
    customer_machine_id UUID REFERENCES customer_machines(id), -- Link to our machine record
    company_id UUID REFERENCES companies(id), -- Link to operator company
    
    -- Structured fields for fast queries (most commonly used)
    product_name TEXT, -- Nayax ProductName
    mdb_code TEXT, -- Extracted MDB code from product name
    authorization_value DECIMAL(10,2), -- Amount authorized
    settlement_value DECIMAL(10,2), -- Amount settled
    currency_code TEXT DEFAULT 'USD',
    
    -- Payment information
    payment_method TEXT, -- Credit Card, Cash, etc.
    card_brand TEXT, -- VISA, MasterCard, etc.
    payment_service_provider TEXT, -- Adyen, etc.
    
    -- Transaction metadata
    transaction_status TEXT, -- 'completed' or 'failed' based on settlement_value
    multivend_transaction BOOLEAN DEFAULT FALSE,
    multivend_products_count INTEGER DEFAULT 0,
    quantity INTEGER DEFAULT 1, -- Hardcoded to 1 for single-item transactions
    
    -- Timestamps
    authorization_datetime TIMESTAMPTZ,
    settlement_datetime TIMESTAMPTZ,
    machine_authorization_time TIMESTAMPTZ,
    
    -- Nayax metadata
    site_id INTEGER,
    site_name TEXT,
    machine_name TEXT, -- Nayax machine name
    machine_number TEXT, -- Nayax machine number
    
    -- Raw API data backup (JSONB)
    raw_data JSONB, -- Complete API response for debugging/future use
    
    -- Processing metadata
    sync_date TIMESTAMPTZ DEFAULT NOW(), -- When this data was synced from API
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Performance

-- Primary query indexes
CREATE INDEX IF NOT EXISTS idx_nayax_transactions_machine_id ON nayax_transactions(machine_id);
CREATE INDEX IF NOT EXISTS idx_nayax_transactions_customer_machine_id ON nayax_transactions(customer_machine_id);
CREATE INDEX IF NOT EXISTS idx_nayax_transactions_company_id ON nayax_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_nayax_transactions_transaction_id ON nayax_transactions(transaction_id);

-- Date/time indexes for filtering
CREATE INDEX IF NOT EXISTS idx_nayax_transactions_authorization_datetime ON nayax_transactions(authorization_datetime);
CREATE INDEX IF NOT EXISTS idx_nayax_transactions_settlement_datetime ON nayax_transactions(settlement_datetime);
CREATE INDEX IF NOT EXISTS idx_nayax_transactions_sync_date ON nayax_transactions(sync_date);

-- Business logic indexes
CREATE INDEX IF NOT EXISTS idx_nayax_transactions_status ON nayax_transactions(transaction_status);
CREATE INDEX IF NOT EXISTS idx_nayax_transactions_payment_method ON nayax_transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_nayax_transactions_mdb_code ON nayax_transactions(mdb_code);

-- JSONB index for raw data queries
CREATE INDEX IF NOT EXISTS idx_nayax_transactions_raw_data_gin ON nayax_transactions USING GIN (raw_data);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_nayax_transactions_customer_machine_date ON nayax_transactions(customer_machine_id, authorization_datetime DESC);
CREATE INDEX IF NOT EXISTS idx_nayax_transactions_company_date ON nayax_transactions(company_id, authorization_datetime DESC);

-- RLS Policies

ALTER TABLE nayax_transactions ENABLE ROW LEVEL SECURITY;

-- Operators can see all transactions for their company
CREATE POLICY "Operators can view their company transactions" ON nayax_transactions
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Operators can insert their company transactions" ON nayax_transactions
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT id FROM companies WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Operators can update their company transactions" ON nayax_transactions
    FOR UPDATE USING (
        company_id IN (
            SELECT id FROM companies WHERE user_id = auth.uid()
        )
    );

-- Customers can see transactions for their machines (including referral users)
CREATE POLICY "Customers can view their machine transactions" ON nayax_transactions
    FOR SELECT USING (
        customer_machine_id IN (
            SELECT id FROM customer_machines 
            WHERE customer_id = auth.uid() OR referral_user_id = auth.uid()
        )
    );

-- Triggers for updated_at timestamps

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_nayax_transactions_updated_at 
    BEFORE UPDATE ON nayax_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE nayax_transactions IS 'Hybrid table storing both processed Nayax transaction data and raw API backup';
COMMENT ON COLUMN nayax_transactions.raw_data IS 'Complete API response from Nayax stored as JSONB for debugging and future flexibility';
COMMENT ON COLUMN nayax_transactions.mdb_code IS 'Extracted MDB code from Nayax ProductName for slot configuration lookup';
COMMENT ON COLUMN nayax_transactions.transaction_status IS 'Derived status: completed (settlement_value > 0) or failed (settlement_value = 0)';
COMMENT ON COLUMN nayax_transactions.quantity IS 'Hardcoded to 1 for single-item transactions, can be updated for multi-vend support'; 