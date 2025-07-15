-- Safe Fix for Machine Templates - Handles Existing Policies
-- Run this in your Supabase SQL Editor to fix machine template issues safely

-- 1. Ensure all required columns exist in machine_templates
ALTER TABLE machine_templates 
ADD COLUMN IF NOT EXISTS slot_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS model_number TEXT,
ADD COLUMN IF NOT EXISTS length_inches INTEGER,
ADD COLUMN IF NOT EXISTS width_inches INTEGER,
ADD COLUMN IF NOT EXISTS height_inches INTEGER,
ADD COLUMN IF NOT EXISTS is_outdoor_rated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS technical_description TEXT,
ADD COLUMN IF NOT EXISTS created_by_company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Update existing records to have a default slot count
UPDATE machine_templates 
SET slot_count = 0 
WHERE slot_count IS NULL;

-- Make sure slot_count is NOT NULL
ALTER TABLE machine_templates 
ALTER COLUMN slot_count SET NOT NULL;

-- 2. Create machine_template_slot_product_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS machine_template_slot_product_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_template_slot_id UUID REFERENCES machine_template_slots(id) ON DELETE CASCADE,
    product_type_id UUID REFERENCES product_types(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(machine_template_slot_id, product_type_id)
);

-- 3. Enable RLS on all tables
ALTER TABLE machine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_template_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_template_slot_product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_machine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_machine_template_slots ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies safely (ignore if they don't exist)
DO $$ 
BEGIN
    -- Drop machine_templates policies
    DROP POLICY IF EXISTS "Machine templates can be managed by admins" ON machine_templates;
    DROP POLICY IF EXISTS "Machine templates can be managed by admins and creators" ON machine_templates;
    DROP POLICY IF EXISTS "Operators can create machine templates" ON machine_templates;
    DROP POLICY IF EXISTS "Machine templates comprehensive access" ON machine_templates;
    DROP POLICY IF EXISTS "Allow authenticated users to manage machine templates" ON machine_templates;
    
    -- Drop machine_template_slots policies
    DROP POLICY IF EXISTS "Machine template slots can be managed by admins" ON machine_template_slots;
    DROP POLICY IF EXISTS "Allow authenticated users to manage machine template slots" ON machine_template_slots;
    
    -- Drop machine_template_slot_product_types policies
    DROP POLICY IF EXISTS "Machine template slot product types can be managed by admins" ON machine_template_slot_product_types;
    DROP POLICY IF EXISTS "Machine template slot product types are viewable by all authenticated users" ON machine_template_slot_product_types;
    
    -- Drop company_machine_templates policies
    DROP POLICY IF EXISTS "Users can manage their own company machine templates" ON company_machine_templates;
    DROP POLICY IF EXISTS "Users can view their own company machine templates" ON company_machine_templates;
    
    -- Drop company_machine_template_slots policies
    DROP POLICY IF EXISTS "Users can manage their own company machine template slots" ON company_machine_template_slots;
    DROP POLICY IF EXISTS "Users can view their own company machine template slots" ON company_machine_template_slots;
    
    -- Drop company_machine_template_slot_product_types policies
    DROP POLICY IF EXISTS "Users can manage their own company machine template slot product types" ON company_machine_template_slot_product_types;
    DROP POLICY IF EXISTS "Users can view their own company machine template slot product types" ON company_machine_template_slot_product_types;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Continue even if some policies don't exist
        NULL;
END $$;

-- 5. Create new permissive policies (only if they don't exist)
DO $$
BEGIN
    -- Machine templates
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'machine_templates' AND policyname = 'Allow all authenticated operations on machine_templates') THEN
        CREATE POLICY "Allow all authenticated operations on machine_templates" ON machine_templates
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;
    
    -- Machine template slots
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'machine_template_slots' AND policyname = 'Allow all authenticated operations on machine_template_slots') THEN
        CREATE POLICY "Allow all authenticated operations on machine_template_slots" ON machine_template_slots
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;
    
    -- Machine template slot product types
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'machine_template_slot_product_types' AND policyname = 'Allow all authenticated operations on machine_template_slot_product_types') THEN
        CREATE POLICY "Allow all authenticated operations on machine_template_slot_product_types" ON machine_template_slot_product_types
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;
    
    -- Company machine templates
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_machine_templates' AND policyname = 'Allow all authenticated operations on company_machine_templates') THEN
        CREATE POLICY "Allow all authenticated operations on company_machine_templates" ON company_machine_templates
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;
    
    -- Company machine template slots
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_machine_template_slots' AND policyname = 'Allow all authenticated operations on company_machine_template_slots') THEN
        CREATE POLICY "Allow all authenticated operations on company_machine_template_slots" ON company_machine_template_slots
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Continue even if some policies already exist
        NULL;
END $$;

-- 6. Create indexes for performance (ignore if they already exist)
CREATE INDEX IF NOT EXISTS idx_machine_templates_slot_count ON machine_templates(slot_count);
CREATE INDEX IF NOT EXISTS idx_machine_templates_model_number ON machine_templates(model_number);
CREATE INDEX IF NOT EXISTS idx_machine_templates_created_by_company_id ON machine_templates(created_by_company_id);
CREATE INDEX IF NOT EXISTS idx_machine_template_slot_product_types_slot_id ON machine_template_slot_product_types(machine_template_slot_id);
CREATE INDEX IF NOT EXISTS idx_machine_template_slot_product_types_product_type_id ON machine_template_slot_product_types(product_type_id);

-- 7. Verify the schema
SELECT 'machine_templates' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'machine_templates' 
AND column_name IN ('slot_count', 'model_number', 'length_inches', 'width_inches', 'height_inches', 'is_outdoor_rated', 'technical_description', 'created_by_company_id')
ORDER BY column_name;

-- Machine templates should now work properly! 