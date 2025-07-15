-- Add slot_configuration JSONB column to machine_templates table
-- This will store slot configurations with optional onboarding fields

-- Add the column
ALTER TABLE machine_templates 
ADD COLUMN IF NOT EXISTS slot_configuration JSONB DEFAULT '[]'::jsonb;

-- Add a comment explaining the structure
COMMENT ON COLUMN machine_templates.slot_configuration IS '
Slot configuration JSON structure:
[
  {
    "row": 1,
    "slot": 1,
    "product_type_id": "uuid",
    "mdb_code": "A1",
    "product_choice": null,        // company_product_id - filled during onboarding
    "commission_rate": null,       // percentage - filled during onboarding
    "vend_price": null,           // final price - filled during onboarding
    "processing_fee": null,       // amount - filled during onboarding
    "sales_tax": null            // amount - filled during onboarding
  }
]

Leave product_choice, commission_rate, vend_price, processing_fee, sales_tax as null
unless creating a pre-built machine template.
';

-- Create an index for better performance when querying JSON
CREATE INDEX IF NOT EXISTS idx_machine_templates_slot_config 
ON machine_templates USING GIN (slot_configuration);

-- Update existing machine templates to have empty slot configuration if null
UPDATE machine_templates 
SET slot_configuration = '[]'::jsonb 
WHERE slot_configuration IS NULL; 