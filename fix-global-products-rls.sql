-- Fix Global Products RLS Policies
-- This script updates the RLS policies to allow operators to add products to the global catalog
-- while restricting edit and delete operations to admins only

-- First, let's ensure the global_products table has the correct schema
-- Check if we need to update the schema from the old version
DO $$
BEGIN
    -- Check if the old schema exists (with product_type as TEXT)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'global_products' 
        AND column_name = 'product_type' 
        AND data_type = 'text'
    ) THEN
        -- Create product_types table if it doesn't exist
        CREATE TABLE IF NOT EXISTS product_types (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Enable RLS on product_types
        ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies for product_types
        DROP POLICY IF EXISTS "Product types are viewable by all authenticated users" ON product_types;
        CREATE POLICY "Product types are viewable by all authenticated users" ON product_types
            FOR SELECT USING (auth.role() = 'authenticated');

        DROP POLICY IF EXISTS "Product types can be managed by admins" ON product_types;
        CREATE POLICY "Product types can be managed by admins" ON product_types
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE id = auth.uid() 
                    AND role = 'admin'
                )
            );

        -- Add new columns to global_products
        ALTER TABLE global_products 
        ADD COLUMN IF NOT EXISTS brand_name TEXT,
        ADD COLUMN IF NOT EXISTS product_name TEXT,
        ADD COLUMN IF NOT EXISTS product_type_id UUID REFERENCES product_types(id),
        ADD COLUMN IF NOT EXISTS image_url TEXT;

        -- Migrate existing data
        UPDATE global_products 
        SET 
            brand_name = 'Unknown',
            product_name = name,
            product_type_id = (
                SELECT id FROM product_types 
                WHERE name = global_products.product_type 
                LIMIT 1
            )
        WHERE brand_name IS NULL;

        -- Insert common product types if they don't exist
        INSERT INTO product_types (name, description) VALUES
        ('soda', 'Soft drinks and carbonated beverages'),
        ('water', 'Bottled water and hydration drinks'),
        ('energy_drink', 'Energy drinks and performance beverages'),
        ('chips', 'Potato chips and snack foods'),
        ('candy', 'Chocolate bars and candy'),
        ('snacks', 'Other snack foods'),
        ('beverages', 'Other beverages')
        ON CONFLICT (name) DO NOTHING;

        -- Update product_type_id for existing products
        UPDATE global_products 
        SET product_type_id = pt.id
        FROM product_types pt
        WHERE global_products.product_type = pt.name
        AND global_products.product_type_id IS NULL;

        -- Drop the old product_type column
        ALTER TABLE global_products DROP COLUMN IF EXISTS product_type;
    END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Global products are viewable by all authenticated users" ON global_products;
DROP POLICY IF EXISTS "Global products can be created by operators and admins" ON global_products;
DROP POLICY IF EXISTS "Global products can be managed by admins" ON global_products;

-- Create updated RLS policies for global_products
-- 1. All authenticated users can view global products
CREATE POLICY "Global products are viewable by all authenticated users" ON global_products
    FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Operators and admins can create new products
CREATE POLICY "Global products can be created by operators and admins" ON global_products
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('operator', 'admin')
        )
    );

-- 3. Only admins can update/edit products
CREATE POLICY "Global products can be updated by admins only" ON global_products
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- 4. Only admins can delete products
CREATE POLICY "Global products can be deleted by admins only" ON global_products
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Also fix the company_products table to use the new schema
-- Update company_products to use company_id instead of operator_id
DO $$
BEGIN
    -- Check if company_products still uses operator_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_products' 
        AND column_name = 'operator_id'
    ) THEN
        -- Add company_id column if it doesn't exist
        ALTER TABLE company_products ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
        
        -- Add price and is_available columns if they don't exist
        ALTER TABLE company_products 
        ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
        
        -- Update company_id based on operator_id (if possible)
        UPDATE company_products 
        SET company_id = u.company_id
        FROM users u
        WHERE company_products.operator_id = u.id
        AND company_products.company_id IS NULL;
        
        -- Drop the old operator_id column
        ALTER TABLE company_products DROP COLUMN IF EXISTS operator_id;
    END IF;
END $$;

-- Update company_products RLS policies
DROP POLICY IF EXISTS "Users can view their own company products" ON company_products;
DROP POLICY IF EXISTS "Users can add products to their own company catalog" ON company_products;
DROP POLICY IF EXISTS "Users can remove products from their own company catalog" ON company_products;

-- Create updated company_products policies
CREATE POLICY "Users can view their own company products" ON company_products
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can add products to their own company catalog" ON company_products
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'operator'
        )
    );

CREATE POLICY "Users can update their own company products" ON company_products
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'operator'
        )
    );

CREATE POLICY "Users can remove products from their own company catalog" ON company_products
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'operator'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_global_products_product_type_id ON global_products(product_type_id);
CREATE INDEX IF NOT EXISTS idx_global_products_brand_name ON global_products(brand_name);
CREATE INDEX IF NOT EXISTS idx_global_products_product_name ON global_products(product_name);
CREATE INDEX IF NOT EXISTS idx_company_products_company_id ON company_products(company_id);
CREATE INDEX IF NOT EXISTS idx_company_products_global_product_id ON company_products(global_product_id);

-- Verify the changes
SELECT 'global_products' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'global_products' 
ORDER BY column_name; 