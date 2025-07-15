-- Fix Machine Templates - Complete Schema Update
-- Run this in your Supabase SQL Editor to ensure all fields exist

-- 1. Add slot_count column to machine_templates table
ALTER TABLE machine_templates 
ADD COLUMN IF NOT EXISTS slot_count INTEGER NOT NULL DEFAULT 0;

-- Update existing records to have a default slot count
UPDATE machine_templates 
SET slot_count = 0 
WHERE slot_count IS NULL;

-- Make sure the column is NOT NULL
ALTER TABLE machine_templates 
ALTER COLUMN slot_count SET NOT NULL;

-- 2. Add new fields to machine_templates table
ALTER TABLE machine_templates 
ADD COLUMN IF NOT EXISTS model_number TEXT,
ADD COLUMN IF NOT EXISTS length_inches INTEGER,
ADD COLUMN IF NOT EXISTS width_inches INTEGER,
ADD COLUMN IF NOT EXISTS height_inches INTEGER,
ADD COLUMN IF NOT EXISTS is_outdoor_rated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS technical_description TEXT;

-- 3. Add new fields to company_machine_templates table (for custom overrides)
ALTER TABLE company_machine_templates 
ADD COLUMN IF NOT EXISTS custom_model_number TEXT,
ADD COLUMN IF NOT EXISTS custom_length_inches INTEGER,
ADD COLUMN IF NOT EXISTS custom_width_inches INTEGER,
ADD COLUMN IF NOT EXISTS custom_height_inches INTEGER,
ADD COLUMN IF NOT EXISTS custom_is_outdoor_rated BOOLEAN,
ADD COLUMN IF NOT EXISTS custom_technical_description TEXT;

-- 4. Create machine_template_slot_product_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS machine_template_slot_product_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_template_slot_id UUID REFERENCES machine_template_slots(id) ON DELETE CASCADE,
    product_type_id UUID REFERENCES product_types(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(machine_template_slot_id, product_type_id)
);

-- 5. Create company_machine_template_slot_product_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS company_machine_template_slot_product_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_machine_template_slot_id UUID REFERENCES company_machine_template_slots(id) ON DELETE CASCADE,
    product_type_id UUID REFERENCES product_types(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_machine_template_slot_id, product_type_id)
);

-- 6. Enable RLS on new tables
ALTER TABLE machine_template_slot_product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_machine_template_slot_product_types ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing policies if they exist
DROP POLICY IF EXISTS "Machine template slot product types are viewable by all authenticated users" ON machine_template_slot_product_types;
DROP POLICY IF EXISTS "Machine template slot product types can be managed by admins" ON machine_template_slot_product_types;
DROP POLICY IF EXISTS "Users can view their own company machine template slot product types" ON company_machine_template_slot_product_types;
DROP POLICY IF EXISTS "Users can manage their own company machine template slot product types" ON company_machine_template_slot_product_types;

-- 8. Create RLS Policies for machine_template_slot_product_types
CREATE POLICY "Machine template slot product types are viewable by all authenticated users" ON machine_template_slot_product_types
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Machine template slot product types can be managed by admins" ON machine_template_slot_product_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- 9. Create RLS Policies for company_machine_template_slot_product_types
CREATE POLICY "Users can view their own company machine template slot product types" ON company_machine_template_slot_product_types
    FOR SELECT USING (
        company_machine_template_slot_id IN (
            SELECT cmts.id FROM company_machine_template_slots cmts
            JOIN company_machine_templates cmt ON cmts.company_machine_template_id = cmt.id
            JOIN users u ON cmt.company_id = u.company_id
            WHERE u.id = auth.uid()
        )
    );

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

-- 10. Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_machine_template_slot_product_types_slot_id ON machine_template_slot_product_types(machine_template_slot_id);
CREATE INDEX IF NOT EXISTS idx_machine_template_slot_product_types_product_type_id ON machine_template_slot_product_types(product_type_id);
CREATE INDEX IF NOT EXISTS idx_company_machine_template_slot_product_types_slot_id ON company_machine_template_slot_product_types(company_machine_template_slot_id);
CREATE INDEX IF NOT EXISTS idx_company_machine_template_slot_product_types_product_type_id ON company_machine_template_slot_product_types(product_type_id);

-- 11. Add indexes for new machine_templates fields
CREATE INDEX IF NOT EXISTS idx_machine_templates_model_number ON machine_templates(model_number);
CREATE INDEX IF NOT EXISTS idx_machine_templates_outdoor_rated ON machine_templates(is_outdoor_rated);

-- 12. Verify the changes
SELECT 'machine_templates' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'machine_templates' 
AND column_name IN ('slot_count', 'model_number', 'length_inches', 'width_inches', 'height_inches', 'is_outdoor_rated', 'technical_description')
ORDER BY column_name;

-- Database schema update complete! 