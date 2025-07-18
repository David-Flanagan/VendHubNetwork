-- Fixed Commission Tables Migration
-- This script creates the commission tables without problematic constraint syntax

-- Step 1: Create commission_earnings table
CREATE TABLE IF NOT EXISTS commission_earnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL,
    operator_company_id UUID NOT NULL,
    customer_machine_id UUID NOT NULL,
    transaction_id VARCHAR(255) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    commission_type VARCHAR(50) NOT NULL,
    base_amount DECIMAL(10,2) NOT NULL,
    commission_percentage DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'earned',
    cashout_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create commission_cashouts table
CREATE TABLE IF NOT EXISTS commission_cashouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    requested_amount DECIMAL(10,2) NOT NULL,
    minimum_cashout_amount DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    paid_at TIMESTAMP WITH TIME ZONE,
    paid_by UUID,
    customer_notes TEXT,
    operator_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create commission_payouts table
CREATE TABLE IF NOT EXISTS commission_payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cashout_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    operator_company_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_reference VARCHAR(255),
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Add foreign key constraints (without IF NOT EXISTS)
DO $$
BEGIN
    -- Add foreign keys for commission_earnings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        BEGIN
            ALTER TABLE commission_earnings ADD CONSTRAINT fk_commission_earnings_customer_id 
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        BEGIN
            ALTER TABLE commission_earnings ADD CONSTRAINT fk_commission_earnings_operator_company_id 
                FOREIGN KEY (operator_company_id) REFERENCES companies(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_machines') THEN
        BEGIN
            ALTER TABLE commission_earnings ADD CONSTRAINT fk_commission_earnings_customer_machine_id 
                FOREIGN KEY (customer_machine_id) REFERENCES customer_machines(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
    
    -- Add foreign keys for commission_cashouts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        BEGIN
            ALTER TABLE commission_cashouts ADD CONSTRAINT fk_commission_cashouts_customer_id 
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        BEGIN
            ALTER TABLE commission_cashouts ADD CONSTRAINT fk_commission_cashouts_paid_by 
                FOREIGN KEY (paid_by) REFERENCES users(id);
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
    
    -- Add foreign keys for commission_payouts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        BEGIN
            ALTER TABLE commission_payouts ADD CONSTRAINT fk_commission_payouts_customer_id 
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        BEGIN
            ALTER TABLE commission_payouts ADD CONSTRAINT fk_commission_payouts_operator_company_id 
                FOREIGN KEY (operator_company_id) REFERENCES companies(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
    
    -- Add cross-table foreign keys
    BEGIN
        ALTER TABLE commission_earnings ADD CONSTRAINT fk_commission_earnings_cashout_id 
            FOREIGN KEY (cashout_id) REFERENCES commission_cashouts(id) ON DELETE SET NULL;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE commission_payouts ADD CONSTRAINT fk_commission_payouts_cashout_id 
            FOREIGN KEY (cashout_id) REFERENCES commission_cashouts(id) ON DELETE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
        
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding foreign keys: %', SQLERRM;
END $$;

-- Step 5: Add check constraints
DO $$
BEGIN
    ALTER TABLE commission_earnings ADD CONSTRAINT chk_commission_earnings_type 
        CHECK (commission_type IN ('owner', 'referral'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE commission_earnings ADD CONSTRAINT chk_commission_earnings_status 
        CHECK (status IN ('earned', 'pending_cashout', 'paid'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE commission_cashouts ADD CONSTRAINT chk_commission_cashouts_status 
        CHECK (status IN ('pending', 'approved', 'rejected', 'paid'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE commission_payouts ADD CONSTRAINT chk_commission_payouts_status 
        CHECK (status IN ('pending', 'completed', 'failed'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Step 6: Create indexes
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

-- Step 7: Enable RLS
ALTER TABLE commission_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_cashouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payouts ENABLE ROW LEVEL SECURITY;

-- Step 8: Create update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 9: Create triggers
DROP TRIGGER IF EXISTS update_commission_earnings_updated_at ON commission_earnings;
CREATE TRIGGER update_commission_earnings_updated_at 
    BEFORE UPDATE ON commission_earnings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_commission_cashouts_updated_at ON commission_cashouts;
CREATE TRIGGER update_commission_cashouts_updated_at 
    BEFORE UPDATE ON commission_cashouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_commission_payouts_updated_at ON commission_payouts;
CREATE TRIGGER update_commission_payouts_updated_at 
    BEFORE UPDATE ON commission_payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Commission tables created successfully!' as status; 