-- Add Technical Information Fields to Machine Templates
-- This migration adds optional technical fields to both global and company machine templates

-- Step 1: Add technical information fields to global_machine_templates
ALTER TABLE global_machine_templates 
ADD COLUMN IF NOT EXISTS model_number TEXT,
ADD COLUMN IF NOT EXISTS serial_number TEXT,
ADD COLUMN IF NOT EXISTS power_consumption TEXT,
ADD COLUMN IF NOT EXISTS technical_description TEXT,
ADD COLUMN IF NOT EXISTS is_outdoor_rated BOOLEAN DEFAULT false;

-- Step 2: Add technical information fields to company_machine_templates
ALTER TABLE company_machine_templates 
ADD COLUMN IF NOT EXISTS model_number TEXT,
ADD COLUMN IF NOT EXISTS serial_number TEXT,
ADD COLUMN IF NOT EXISTS power_consumption TEXT,
ADD COLUMN IF NOT EXISTS technical_description TEXT,
ADD COLUMN IF NOT EXISTS is_outdoor_rated BOOLEAN DEFAULT false;

-- Step 3: Create indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_global_machine_templates_outdoor_rated ON global_machine_templates(is_outdoor_rated);
CREATE INDEX IF NOT EXISTS idx_global_machine_templates_model_number ON global_machine_templates(model_number);
CREATE INDEX IF NOT EXISTS idx_company_machine_templates_outdoor_rated ON company_machine_templates(is_outdoor_rated);
CREATE INDEX IF NOT EXISTS idx_company_machine_templates_model_number ON company_machine_templates(model_number);

-- Step 4: Verify the changes
SELECT 'global_machine_templates' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'global_machine_templates' 
AND column_name IN ('model_number', 'serial_number', 'power_consumption', 'technical_description', 'is_outdoor_rated')
ORDER BY column_name;

SELECT 'company_machine_templates' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'company_machine_templates' 
AND column_name IN ('model_number', 'serial_number', 'power_consumption', 'technical_description', 'is_outdoor_rated')
ORDER BY column_name;

-- Step 5: Confirm migration completion
SELECT 'Technical information fields added successfully!' as status; 