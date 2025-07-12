-- Add slot_count column to machine_templates table
-- Run this in your Supabase SQL Editor

-- Add slot_count column if it doesn't exist
ALTER TABLE machine_templates 
ADD COLUMN IF NOT EXISTS slot_count INTEGER NOT NULL DEFAULT 0;

-- Update existing records to have a default slot count
-- This will set slot_count to 0 for existing templates
UPDATE machine_templates 
SET slot_count = 0 
WHERE slot_count IS NULL;

-- Make sure the column is NOT NULL
ALTER TABLE machine_templates 
ALTER COLUMN slot_count SET NOT NULL; 