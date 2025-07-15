-- New Machine Templates System - 3 Table Structure
-- This creates the simplified machine template system

-- Step 1: Redesign the global_machine_templates table (renamed from machine_templates)
-- First, drop the old machine_templates table if it exists
DROP TABLE IF EXISTS machine_templates CASCADE;

-- Create the new global_machine_templates table
CREATE TABLE global_machine_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category_id UUID REFERENCES machine_categories(id) ON DELETE RESTRICT,
    description TEXT,
    image_url TEXT,
    dimensions TEXT, -- Format: "LxWxH inches"
    slot_count INTEGER NOT NULL,
    slot_configuration JSONB NOT NULL, -- New JSON structure for slot layout
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create company_machine_templates table
-- This stores operator's customized copies of global templates
CREATE TABLE company_machine_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    global_machine_template_id UUID REFERENCES global_machine_templates(id) ON DELETE CASCADE,
    
    -- Complete copy of global template data (fully editable)
    name TEXT NOT NULL,
    category_id UUID REFERENCES machine_categories(id) ON DELETE RESTRICT,
    description TEXT,
    image_url TEXT,
    dimensions TEXT,
    slot_count INTEGER NOT NULL,
    slot_configuration JSONB NOT NULL,
    
    -- Company-specific settings
    is_available_for_customers BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one copy per company per global template
    UNIQUE(company_id, global_machine_template_id)
);

-- Step 3: Create customer_machines table (redesigned)
-- This stores customer's machine placements with their product selections
CREATE TABLE customer_machines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Customer and Operator Relationship
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    company_machine_template_id UUID REFERENCES company_machine_templates(id) ON DELETE CASCADE,
    
    -- Complete copy of company machine template data + customer decisions
    machine_name TEXT NOT NULL,
    machine_image_url TEXT,
    machine_dimensions TEXT,
    slot_count INTEGER NOT NULL,
    
    -- Customer's slot configuration with product selections and pricing
    slot_configuration JSONB NOT NULL, -- Contains complete product data + pricing
    
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
    
    -- Onboarding Status
    onboarding_status TEXT NOT NULL DEFAULT 'in_progress' CHECK (onboarding_status IN ('in_progress', 'completed', 'abandoned')),
    current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 3),
    
    -- Approval Process
    approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Step 4: Enable Row Level Security on all tables
ALTER TABLE global_machine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_machine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_machines ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS Policies

-- Global Machine Templates Policies
CREATE POLICY "Global machine templates are viewable by all authenticated users" ON global_machine_templates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Global machine templates can be managed by admins and operators" ON global_machine_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'operator')
        )
    );

-- Company Machine Templates Policies
CREATE POLICY "Users can view their own company machine templates" ON company_machine_templates
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own company machine templates" ON company_machine_templates
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() AND role = 'operator'
        )
    );

-- Customer Machines Policies
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

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_global_machine_templates_category_id ON global_machine_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_global_machine_templates_active ON global_machine_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_company_machine_templates_company_id ON company_machine_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_company_machine_templates_global_id ON company_machine_templates(global_machine_template_id);
CREATE INDEX IF NOT EXISTS idx_company_machine_templates_available ON company_machine_templates(is_available_for_customers);
CREATE INDEX IF NOT EXISTS idx_customer_machines_customer_id ON customer_machines(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_machines_company_id ON customer_machines(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_machines_approval_status ON customer_machines(approval_status);
CREATE INDEX IF NOT EXISTS idx_customer_machines_onboarding_status ON customer_machines(onboarding_status);

-- Step 7: Create triggers for updated_at
CREATE TRIGGER update_global_machine_templates_updated_at 
    BEFORE UPDATE ON global_machine_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_machine_templates_updated_at 
    BEFORE UPDATE ON company_machine_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_machines_updated_at 
    BEFORE UPDATE ON customer_machines 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Verify the new structure
SELECT 'New machine templates system created successfully!' as status; 