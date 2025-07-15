-- Customer Onboarding System Database Setup (Simple & Clean)
-- This script creates the necessary tables and fields for the customer onboarding system

-- Add processing fee and sales tax fields to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS processing_fee_percentage DECIMAL(5,2) DEFAULT 2.90,
ADD COLUMN IF NOT EXISTS sales_tax_percentage DECIMAL(5,2) DEFAULT 8.25;

-- Create customer_machines table
CREATE TABLE IF NOT EXISTS customer_machines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    company_machine_template_id UUID REFERENCES company_machine_templates(id) ON DELETE CASCADE,
    
    -- Host Location Information
    host_business_name TEXT NOT NULL,
    machine_placement_area TEXT NOT NULL,
    host_address TEXT NOT NULL,
    host_latitude DECIMAL(10,8),
    host_longitude DECIMAL(11,8),
    point_of_contact_name TEXT NOT NULL,
    point_of_contact_position TEXT NOT NULL,
    point_of_contact_email TEXT NOT NULL,
    point_of_contact_phone TEXT,
    
    -- Commission Settings
    default_commission_rate DECIMAL(5,2) NOT NULL,
    processing_fee_percentage DECIMAL(5,2) NOT NULL,
    sales_tax_percentage DECIMAL(5,2) NOT NULL,
    
    -- Approval Process
    approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    nayax_machine_id TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    
    -- Onboarding Status
    onboarding_status TEXT NOT NULL DEFAULT 'in_progress' CHECK (onboarding_status IN ('in_progress', 'completed', 'abandoned')),
    current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 5),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create customer_machine_products table
CREATE TABLE IF NOT EXISTS customer_machine_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_machine_id UUID REFERENCES customer_machines(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    slot_number INTEGER NOT NULL,
    product_type_id UUID REFERENCES product_types(id) ON DELETE RESTRICT,
    company_product_id UUID REFERENCES company_products(id) ON DELETE RESTRICT,
    
    -- Pricing Information
    base_price DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    final_price DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    processing_fee_amount DECIMAL(10,2) NOT NULL,
    sales_tax_amount DECIMAL(10,2) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE customer_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_machine_products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Customers can view their own machines" ON customer_machines;
DROP POLICY IF EXISTS "Customers can manage their own machines during onboarding" ON customer_machines;
DROP POLICY IF EXISTS "Operators can view machines for their company" ON customer_machines;
DROP POLICY IF EXISTS "Operators can update approval status" ON customer_machines;
DROP POLICY IF EXISTS "Admins can view all customer machines" ON customer_machines;

DROP POLICY IF EXISTS "Customers can view their own machine products" ON customer_machine_products;
DROP POLICY IF EXISTS "Customers can manage their own machine products" ON customer_machine_products;
DROP POLICY IF EXISTS "Operators can view machine products for their company" ON customer_machine_products;
DROP POLICY IF EXISTS "Admins can view all machine products" ON customer_machine_products;

-- Create RLS Policies for customer_machines
CREATE POLICY "Customers can view their own machines" ON customer_machines
    FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Customers can manage their own machines during onboarding" ON customer_machines
    FOR ALL USING (
        customer_id = auth.uid() AND 
        onboarding_status IN ('in_progress', 'completed')
    );

CREATE POLICY "Operators can view machines for their company" ON customer_machines
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() AND role = 'operator'
        )
    );

CREATE POLICY "Operators can update approval status" ON customer_machines
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() AND role = 'operator'
        )
    );

CREATE POLICY "Admins can view all customer machines" ON customer_machines
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create RLS Policies for customer_machine_products
CREATE POLICY "Customers can view their own machine products" ON customer_machine_products
    FOR SELECT USING (
        customer_machine_id IN (
            SELECT id FROM customer_machines 
            WHERE customer_id = auth.uid()
        )
    );

CREATE POLICY "Customers can manage their own machine products" ON customer_machine_products
    FOR ALL USING (
        customer_machine_id IN (
            SELECT id FROM customer_machines 
            WHERE customer_id = auth.uid() AND onboarding_status IN ('in_progress', 'completed')
        )
    );

CREATE POLICY "Operators can view machine products for their company" ON customer_machine_products
    FOR SELECT USING (
        customer_machine_id IN (
            SELECT cm.id FROM customer_machines cm
            JOIN users u ON cm.company_id = u.company_id
            WHERE u.id = auth.uid() AND u.role = 'operator'
        )
    );

CREATE POLICY "Admins can view all machine products" ON customer_machine_products
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_machines_customer_id ON customer_machines(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_machines_company_id ON customer_machines(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_machines_approval_status ON customer_machines(approval_status);
CREATE INDEX IF NOT EXISTS idx_customer_machines_onboarding_status ON customer_machines(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_customer_machine_products_customer_machine_id ON customer_machine_products(customer_machine_id);
CREATE INDEX IF NOT EXISTS idx_customer_machine_products_row_slot ON customer_machine_products(row_number, slot_number);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_customer_machines_updated_at ON customer_machines;
CREATE TRIGGER update_customer_machines_updated_at 
    BEFORE UPDATE ON customer_machines 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Database setup complete 