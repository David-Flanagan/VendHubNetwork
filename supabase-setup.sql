-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create global_products table
CREATE TABLE IF NOT EXISTS global_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    product_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create company_products table (junction table between operators and global products)
CREATE TABLE IF NOT EXISTS company_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    global_product_id UUID REFERENCES global_products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(operator_id, global_product_id)
);

-- Create operators table for additional operator information
CREATE TABLE IF NOT EXISTS operators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    company_name TEXT NOT NULL,
    company_description TEXT,
    contact_email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table for role management
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'customer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE global_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for global_products (readable by all authenticated users)
CREATE POLICY "Global products are viewable by all authenticated users" ON global_products
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Global products can be created by operators and admins" ON global_products
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('operator', 'admin')
        )
    );

-- RLS Policies for company_products
CREATE POLICY "Users can view their own company products" ON company_products
    FOR SELECT USING (operator_id = auth.uid());

CREATE POLICY "Users can add products to their own company catalog" ON company_products
    FOR INSERT WITH CHECK (
        operator_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'operator'
        )
    );

CREATE POLICY "Users can remove products from their own company catalog" ON company_products
    FOR DELETE USING (
        operator_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'operator'
        )
    );

-- RLS Policies for operators
CREATE POLICY "Users can view their own operator profile" ON operators
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own operator profile" ON operators
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own operator profile" ON operators
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON user_roles
    FOR SELECT USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_global_products_product_type ON global_products(product_type);
CREATE INDEX IF NOT EXISTS idx_company_products_operator_id ON company_products(operator_id);
CREATE INDEX IF NOT EXISTS idx_company_products_global_product_id ON company_products(global_product_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_global_products_updated_at 
    BEFORE UPDATE ON global_products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operators_updated_at 
    BEFORE UPDATE ON operators 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample product types for reference
INSERT INTO global_products (name, description, product_type) VALUES
('Coca-Cola Classic', 'Classic Coca-Cola soft drink', 'soda'),
('Pepsi', 'Pepsi cola soft drink', 'soda'),
('Dasani Water', 'Purified drinking water', 'water'),
('Red Bull', 'Energy drink with caffeine and taurine', 'energy_drink'),
('Doritos Nacho Cheese', 'Nacho cheese flavored tortilla chips', 'chips'),
('Snickers', 'Chocolate bar with caramel, nougat, and peanuts', 'candy'),
('Cheetos Crunchy', 'Crunchy cheese-flavored snacks', 'chips'),
('Mountain Dew', 'Citrus-flavored soft drink', 'soda'),
('Monster Energy', 'High-performance energy drink', 'energy_drink'),
('Lay''s Classic', 'Classic potato chips', 'chips')
ON CONFLICT DO NOTHING; 