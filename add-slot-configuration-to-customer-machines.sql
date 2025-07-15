-- Add slot_configuration JSON field to customer_machines table
-- This aligns with our 3-table system where customer_machines stores complete product snapshots

-- Add slot_configuration JSON field to customer_machines table
ALTER TABLE customer_machines 
ADD COLUMN IF NOT EXISTS slot_configuration JSONB;

-- Drop the customer_machine_products table since we're storing everything in JSON
DROP TABLE IF EXISTS customer_machine_products CASCADE;

-- Add an index on the slot_configuration field for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_machines_slot_configuration 
ON customer_machines USING GIN (slot_configuration);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customer_machines' 
AND column_name = 'slot_configuration'; 