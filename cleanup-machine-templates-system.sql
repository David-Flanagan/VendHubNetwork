-- Machine Templates System Cleanup
-- This script removes all existing machine template data and old tables
-- Run this to prepare for the new 3-table system

-- Step 1: Delete all existing customer machine data (if any exists)
-- This removes any customer onboarding data from the old system
DELETE FROM customer_machine_products;
DELETE FROM customer_machines;

-- Step 2: Delete all existing company machine template data
-- This removes operator's machine associations from the old system
DELETE FROM company_machine_template_slot_product_types;
DELETE FROM company_machine_template_slots;
DELETE FROM company_machine_templates;

-- Step 3: Delete all existing global machine template data
-- This removes the machine templates and their slot configurations
DELETE FROM machine_template_slot_product_types;
DELETE FROM machine_template_slots;
DELETE FROM machine_templates;

-- Step 4: Drop the old complex tables that we no longer need
-- These tables are part of the over-engineered system

-- Drop junction tables for slot product types
DROP TABLE IF EXISTS machine_template_slot_product_types CASCADE;
DROP TABLE IF EXISTS company_machine_template_slot_product_types CASCADE;

-- Drop slot configuration tables
DROP TABLE IF EXISTS machine_template_slots CASCADE;
DROP TABLE IF EXISTS company_machine_template_slots CASCADE;

-- Drop company machine templates junction table
DROP TABLE IF EXISTS company_machine_templates CASCADE;

-- Step 5: Clean up any orphaned data
-- Remove any machine categories that might be empty now
DELETE FROM machine_categories 
WHERE id NOT IN (
    SELECT DISTINCT category_id 
    FROM machine_templates 
    WHERE category_id IS NOT NULL
);

-- Step 6: Verify cleanup
-- Check that all old tables are gone and data is cleaned
SELECT 'Cleanup completed. Old machine template system removed.' as status;

-- Note: machine_categories table is kept for future use
-- Note: machine_templates table structure will be redesigned in next step 