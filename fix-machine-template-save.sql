-- Fix Machine Template Save Issue
-- This script ensures the database supports multiple product types per slot

-- First, let's check if the machine_template_slot_product_types table exists
-- If not, create it
CREATE TABLE IF NOT EXISTS machine_template_slot_product_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_template_slot_id UUID REFERENCES machine_template_slots(id) ON DELETE CASCADE,
    product_type_id UUID REFERENCES product_types(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(machine_template_slot_id, product_type_id)
);

-- Create the company version as well
CREATE TABLE IF NOT EXISTS company_machine_template_slot_product_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_machine_template_slot_id UUID REFERENCES company_machine_template_slots(id) ON DELETE CASCADE,
    product_type_id UUID REFERENCES product_types(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_machine_template_slot_id, product_type_id)
);

-- Enable RLS on the new tables
ALTER TABLE machine_template_slot_product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_machine_template_slot_product_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for machine_template_slot_product_types
DROP POLICY IF EXISTS "Machine template slot product types are viewable by all authenticated users" ON machine_template_slot_product_types;
CREATE POLICY "Machine template slot product types are viewable by all authenticated users" ON machine_template_slot_product_types
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Machine template slot product types can be managed by admins" ON machine_template_slot_product_types;
CREATE POLICY "Machine template slot product types can be managed by admins" ON machine_template_slot_product_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- RLS Policies for company_machine_template_slot_product_types
DROP POLICY IF EXISTS "Users can view their own company machine template slot product types" ON company_machine_template_slot_product_types;
CREATE POLICY "Users can view their own company machine template slot product types" ON company_machine_template_slot_product_types
    FOR SELECT USING (
        company_machine_template_slot_id IN (
            SELECT cmts.id FROM company_machine_template_slots cmts
            JOIN company_machine_templates cmt ON cmts.company_machine_template_id = cmt.id
            JOIN users u ON cmt.company_id = u.company_id
            WHERE u.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage their own company machine template slot product types" ON company_machine_template_slot_product_types;
CREATE POLICY "Users can manage their own company machine template slot product types" ON company_machine_template_slot_product_types
    FOR ALL USING (
        company_machine_template_slot_id IN (
            SELECT cmts.id FROM company_machine_template_slots cmts
            JOIN company_machine_templates cmt ON cmts.company_machine_template_id = cmt.id
            JOIN users u ON cmt.company_id = u.company_id
            WHERE u.id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'operator'
        )
    );

-- Create indexes for the new tables
CREATE INDEX IF NOT EXISTS idx_machine_template_slot_product_types_slot_id ON machine_template_slot_product_types(machine_template_slot_id);
CREATE INDEX IF NOT EXISTS idx_machine_template_slot_product_types_product_type_id ON machine_template_slot_product_types(product_type_id);
CREATE INDEX IF NOT EXISTS idx_company_machine_template_slot_product_types_slot_id ON company_machine_template_slot_product_types(company_machine_template_slot_id);
CREATE INDEX IF NOT EXISTS idx_company_machine_template_slot_product_types_product_type_id ON company_machine_template_slot_product_types(product_type_id);

-- Also ensure the machine_templates table has the new fields
ALTER TABLE machine_templates 
ADD COLUMN IF NOT EXISTS model_number TEXT,
ADD COLUMN IF NOT EXISTS length_inches INTEGER,
ADD COLUMN IF NOT EXISTS width_inches INTEGER,
ADD COLUMN IF NOT EXISTS height_inches INTEGER,
ADD COLUMN IF NOT EXISTS is_outdoor_rated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS technical_description TEXT,
ADD COLUMN IF NOT EXISTS created_by_company UUID REFERENCES companies(id);

-- Add indexes for new machine_templates fields
CREATE INDEX IF NOT EXISTS idx_machine_templates_model_number ON machine_templates(model_number);
CREATE INDEX IF NOT EXISTS idx_machine_templates_outdoor_rated ON machine_templates(is_outdoor_rated);
CREATE INDEX IF NOT EXISTS idx_machine_templates_created_by_company ON machine_templates(created_by_company);

-- Verify the tables exist
SELECT 'machine_template_slot_product_types' as table_name, COUNT(*) as row_count FROM machine_template_slot_product_types
UNION ALL
SELECT 'company_machine_template_slot_product_types' as table_name, COUNT(*) as row_count FROM company_machine_template_slot_product_types; 