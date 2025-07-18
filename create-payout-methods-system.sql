-- Create payout methods system for operators
-- This allows operators to configure their own payout methods and settings

-- Create payout_methods table to store available payout method types
CREATE TABLE IF NOT EXISTS payout_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create operator_payout_settings table to store operator-specific payout configurations
CREATE TABLE IF NOT EXISTS operator_payout_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    payout_method_id UUID REFERENCES payout_methods(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT false,
    minimum_amount DECIMAL(10,2) DEFAULT 0,
    processing_fee_percentage DECIMAL(5,2) DEFAULT 0,
    processing_fee_fixed DECIMAL(10,2) DEFAULT 0,
    processing_time_days INTEGER DEFAULT 3,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one setting per company per payout method
    UNIQUE(company_id, payout_method_id)
);

-- Create payout_requests table to track customer payout requests
CREATE TABLE IF NOT EXISTS payout_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    payout_method_id UUID REFERENCES payout_methods(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    processing_fee DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default payout methods
INSERT INTO payout_methods (name, display_name, description) VALUES
('check', 'Request a Check', 'Traditional paper check mailed to your address'),
('ach_transfer', 'ACH Bank Transfer', 'Direct deposit to your bank account'),
('paypal', 'PayPal Transfer', 'Transfer to your PayPal account'),
('wire_transfer', 'Wire Transfer', 'International or domestic wire transfer'),
('cash_pickup', 'Cash Pickup', 'Cash pickup at designated location')
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE payout_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_payout_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payout_methods (public read access)
CREATE POLICY "Anyone can view payout methods" ON payout_methods
    FOR SELECT USING (true);

-- RLS Policies for operator_payout_settings
CREATE POLICY "Operators can view their own payout settings" ON operator_payout_settings
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() AND role = 'operator'
        )
    );

CREATE POLICY "Operators can manage their own payout settings" ON operator_payout_settings
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() AND role = 'operator'
        )
    );

-- Customers can view payout settings for companies they work with
CREATE POLICY "Customers can view operator payout settings" ON operator_payout_settings
    FOR SELECT USING (
        company_id IN (
            SELECT DISTINCT company_id FROM customer_machines 
            WHERE customer_id = auth.uid()
        )
    );

-- Admins can view all payout settings
CREATE POLICY "Admins can view all payout settings" ON operator_payout_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for payout_requests
CREATE POLICY "Customers can view their own payout requests" ON payout_requests
    FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Customers can create their own payout requests" ON payout_requests
    FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Operators can view payout requests for their company" ON payout_requests
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() AND role = 'operator'
        )
    );

CREATE POLICY "Operators can update payout requests for their company" ON payout_requests
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() AND role = 'operator'
        )
    );

-- Admins can view all payout requests
CREATE POLICY "Admins can view all payout requests" ON payout_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_operator_payout_settings_company_id ON operator_payout_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_operator_payout_settings_method_id ON operator_payout_settings(payout_method_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_customer_id ON payout_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_company_id ON payout_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_operator_payout_settings_updated_at 
    BEFORE UPDATE ON operator_payout_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payout_requests_updated_at 
    BEFORE UPDATE ON payout_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 