-- Fix onboarding constraints for customer_machines table
-- This updates the current_step constraint to allow step 4

-- Drop the existing constraint
ALTER TABLE customer_machines DROP CONSTRAINT IF EXISTS customer_machines_current_step_check;

-- Add the new constraint that allows steps 1-4
ALTER TABLE customer_machines ADD CONSTRAINT customer_machines_current_step_check 
    CHECK (current_step BETWEEN 1 AND 4);

-- Verify the constraint was updated
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'customer_machines'::regclass 
    AND conname = 'customer_machines_current_step_check';

-- Also ensure the onboarding_status constraint is correct
ALTER TABLE customer_machines DROP CONSTRAINT IF EXISTS customer_machines_onboarding_status_check;

ALTER TABLE customer_machines ADD CONSTRAINT customer_machines_onboarding_status_check 
    CHECK (onboarding_status IN ('in_progress', 'completed', 'abandoned'));

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'customer_machines' 
ORDER BY ordinal_position; 