-- Check current state of machine templates
-- This script will help us understand what data exists and create test data if needed

-- Check if we have any machine categories
SELECT 'Machine Categories:' as info;
SELECT id, name, description FROM machine_categories ORDER BY name;

-- Check if we have any global machine templates
SELECT 'Global Machine Templates:' as info;
SELECT id, name, category_id, slot_count, created_at FROM global_machine_templates ORDER BY name;

-- Check if we have any company machine templates
SELECT 'Company Machine Templates:' as info;
SELECT id, company_id, name, category_id, slot_count, is_active FROM company_machine_templates ORDER BY company_id, name;

-- Check if we have any companies
SELECT 'Companies:' as info;
SELECT id, name, contact_email FROM companies ORDER BY name;

-- Create test data if needed
-- First, let's create some machine categories if they don't exist
INSERT INTO machine_categories (name, description) VALUES
  ('Snack Machines', 'Traditional snack vending machines'),
  ('Beverage Machines', 'Cold drink vending machines'),
  ('Combo Machines', 'Combination snack and beverage machines'),
  ('Healthy Options', 'Machines focused on healthy snacks and drinks')
ON CONFLICT (name) DO NOTHING;

-- Create some global machine templates if they don't exist
INSERT INTO global_machine_templates (name, category_id, description, dimensions, slot_count, slot_configuration, is_active) 
SELECT 
  'Standard Snack Machine',
  mc.id,
  'Traditional snack vending machine with 40 slots',
  '72" H x 36" W x 30" D',
  40,
  '{"rows": [{"row_number": 1, "slots": [{"slot_number": 1, "alias": "A1", "mdb_code": "01", "allowed_product_types": ["snacks"]}]}]}',
  true
FROM machine_categories mc WHERE mc.name = 'Snack Machines'
ON CONFLICT (name) DO NOTHING;

INSERT INTO global_machine_templates (name, category_id, description, dimensions, slot_count, slot_configuration, is_active) 
SELECT 
  'Premium Beverage Machine',
  mc.id,
  'Cold drink machine with 24 slots',
  '72" H x 36" W x 30" D',
  24,
  '{"rows": [{"row_number": 1, "slots": [{"slot_number": 1, "alias": "A1", "mdb_code": "01", "allowed_product_types": ["beverages"]}]}]}',
  true
FROM machine_categories mc WHERE mc.name = 'Beverage Machines'
ON CONFLICT (name) DO NOTHING;

INSERT INTO global_machine_templates (name, category_id, description, dimensions, slot_count, slot_configuration, is_active) 
SELECT 
  'Combo Snack & Beverage',
  mc.id,
  'Combination machine with 32 snack slots and 16 beverage slots',
  '72" H x 48" W x 30" D',
  48,
  '{"rows": [{"row_number": 1, "slots": [{"slot_number": 1, "alias": "A1", "mdb_code": "01", "allowed_product_types": ["snacks", "beverages"]}]}]}',
  true
FROM machine_categories mc WHERE mc.name = 'Combo Machines'
ON CONFLICT (name) DO NOTHING;

-- Show final state
SELECT 'Final Machine Categories:' as info;
SELECT id, name, description FROM machine_categories ORDER BY name;

SELECT 'Final Global Machine Templates:' as info;
SELECT id, name, category_id, slot_count, created_at FROM global_machine_templates ORDER BY name; 