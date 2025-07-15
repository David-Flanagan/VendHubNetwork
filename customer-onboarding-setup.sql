-- Customer Onboarding System Database Setup
-- This script creates the necessary tables and fields for the customer onboarding system

-- Add processing fee and sales tax fields to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS processing_fee_percentage DECIMAL(5,2) DEFAULT 2.90,
ADD COLUMN IF NOT EXISTS sales_tax_percentage DECIMAL(5,2) DEFAULT 8.25;

-- Create customer_machines table
CREATE TABLE IF NOT EXISTS customer_machines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Customer and Operator Relationship
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Machine Selection (Step 1)
    company_machine_template_id UUID REFERENCES company_machine_templates(id) ON DELETE CASCADE,
    
    -- Host Location Information (Step 4)
    host_business_name TEXT NOT NULL,
    machine_placement_area TEXT NOT NULL,
    host_address TEXT NOT NULL,
    host_latitude DECIMAL(10,8),
    host_longitude DECIMAL(11,8),
    point_of_contact_name TEXT NOT NULL,
    point_of_contact_position TEXT NOT NULL,
    point_of_contact_email TEXT NOT NULL,
    point_of_contact_phone TEXT,
    
    -- Commission Settings (Step 3)
    default_commission_rate DECIMAL(5,2) NOT NULL, -- 0.00 to 50.00
    processing_fee_percentage DECIMAL(5,2) NOT NULL, -- From company settings
    sales_tax_percentage DECIMAL(5,2) NOT NULL, -- From company settings
    
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
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure one active onboarding per customer-company pair
    UNIQUE(customer_id, company_id, onboarding_status) WHERE onboarding_status = 'in_progress'
);

-- Create customer_machine_products table for product selections
CREATE TABLE IF NOT EXISTS customer_machine_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_machine_id UUID REFERENCES customer_machines(id) ON DELETE CASCADE,
    
    -- Slot and Product Information
    row_number INTEGER NOT NULL,
    slot_number INTEGER NOT NULL,
    product_type_id UUID REFERENCES product_types(id) ON DELETE RESTRICT,
    company_product_id UUID REFERENCES company_products(id) ON DELETE RESTRICT,
    
    -- Pricing Information
    base_price DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL, -- Individual rate or default
    final_price DECIMAL(10,2) NOT NULL,
    
    -- Calculations breakdown (for transparency)
    commission_amount DECIMAL(10,2) NOT NULL,
    processing_fee_amount DECIMAL(10,2) NOT NULL,
    sales_tax_amount DECIMAL(10,2) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one product per slot
    UNIQUE(customer_machine_id, row_number, slot_number)
);

-- Enable Row Level Security on new tables
ALTER TABLE customer_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_machine_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_machines

-- Customers can view their own machines
CREATE POLICY "Customers can view their own machines" ON customer_machines
    FOR SELECT USING (customer_id = auth.uid());

-- Customers can create and update their own machines during onboarding
CREATE POLICY "Customers can manage their own machines during onboarding" ON customer_machines
    FOR ALL USING (
        customer_id = auth.uid() AND 
        onboarding_status IN ('in_progress', 'completed')
    );

-- Operators can view machines for their company
CREATE POLICY "Operators can view machines for their company" ON customer_machines
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() AND role = 'operator'
        )
    );

-- Operators can update approval status for their company's machines
CREATE POLICY "Operators can update approval status" ON customer_machines
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() AND role = 'operator'
        )
    );

-- Admins can view all machines
CREATE POLICY "Admins can view all customer machines" ON customer_machines
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for customer_machine_products

-- Customers can view their own machine products
CREATE POLICY "Customers can view their own machine products" ON customer_machine_products
    FOR SELECT USING (
        customer_machine_id IN (
            SELECT id FROM customer_machines 
            WHERE customer_id = auth.uid()
        )
    );

-- Customers can manage their own machine products during onboarding
CREATE POLICY "Customers can manage their own machine products" ON customer_machine_products
    FOR ALL USING (
        customer_machine_id IN (
            SELECT id FROM customer_machines 
            WHERE customer_id = auth.uid() AND onboarding_status IN ('in_progress', 'completed')
        )
    );

-- Operators can view products for their company's machines
CREATE POLICY "Operators can view machine products for their company" ON customer_machine_products
    FOR SELECT USING (
        customer_machine_id IN (
            SELECT cm.id FROM customer_machines cm
            JOIN users u ON cm.company_id = u.company_id
            WHERE u.id = auth.uid() AND u.role = 'operator'
        )
    );

-- Admins can view all machine products
CREATE POLICY "Admins can view all machine products" ON customer_machine_products
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_machines_customer_id ON customer_machines(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_machines_company_id ON customer_machines(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_machines_approval_status ON customer_machines(approval_status);
CREATE INDEX IF NOT EXISTS idx_customer_machines_onboarding_status ON customer_machines(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_customer_machine_products_customer_machine_id ON customer_machine_products(customer_machine_id);
CREATE INDEX IF NOT EXISTS idx_customer_machine_products_row_slot ON customer_machine_products(row_number, slot_number);

-- Create triggers for updated_at
CREATE TRIGGER update_customer_machines_updated_at 
    BEFORE UPDATE ON customer_machines 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Database setup complete
-- The customer onboarding system is now ready for implementation. 