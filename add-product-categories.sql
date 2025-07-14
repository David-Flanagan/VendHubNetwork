-- Add Product Categories to VendHub Network
-- This script creates product categories and updates the global_products table

-- Create product_categories table
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add product_category_id column to global_products table
ALTER TABLE global_products 
ADD COLUMN IF NOT EXISTS product_category_id UUID REFERENCES product_categories(id);

-- Enable RLS on product_categories
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_categories
-- Anyone can view product categories
CREATE POLICY "Product categories are viewable by all authenticated users" ON product_categories
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can create, update, and delete product categories
CREATE POLICY "Product categories can be created by admins only" ON product_categories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Product categories can be updated by admins only" ON product_categories
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Product categories can be deleted by admins only" ON product_categories
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories(name);
CREATE INDEX IF NOT EXISTS idx_global_products_product_category_id ON global_products(product_category_id);

-- Create trigger for updated_at on product_categories
CREATE TRIGGER update_product_categories_updated_at 
    BEFORE UPDATE ON product_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default product categories
INSERT INTO product_categories (name, description) VALUES
('Beverages', 'Drinks and liquid refreshments'),
('Snacks', 'Food items for quick consumption'),
('Candy & Chocolate', 'Sweet treats and confectionery'),
('Health & Wellness', 'Nutritional and health-focused products'),
('Frozen Foods', 'Frozen meals and desserts'),
('Hot Foods', 'Warm meals and prepared foods'),
('Personal Care', 'Hygiene and personal care items'),
('Electronics', 'Small electronic devices and accessories'),
('Other', 'Miscellaneous products')
ON CONFLICT (name) DO NOTHING;

-- Update existing products to have a default category
-- First, let's set all existing products to "Other" category
UPDATE global_products 
SET product_category_id = (SELECT id FROM product_categories WHERE name = 'Other')
WHERE product_category_id IS NULL;

-- Now let's categorize existing products based on their product_type
UPDATE global_products 
SET product_category_id = (SELECT id FROM product_categories WHERE name = 'Beverages')
WHERE product_type IN ('soda', 'water', 'energy_drink') 
AND product_category_id = (SELECT id FROM product_categories WHERE name = 'Other');

UPDATE global_products 
SET product_category_id = (SELECT id FROM product_categories WHERE name = 'Snacks')
WHERE product_type IN ('chips') 
AND product_category_id = (SELECT id FROM product_categories WHERE name = 'Other');

UPDATE global_products 
SET product_category_id = (SELECT id FROM product_categories WHERE name = 'Candy & Chocolate')
WHERE product_type IN ('candy') 
AND product_category_id = (SELECT id FROM product_categories WHERE name = 'Other');

-- Make product_category_id NOT NULL after setting default values
ALTER TABLE global_products 
ALTER COLUMN product_category_id SET NOT NULL;

-- Display the current schema for verification
SELECT 'product_categories' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'product_categories'
ORDER BY ordinal_position;

SELECT 'global_products' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'global_products'
ORDER BY ordinal_position; 