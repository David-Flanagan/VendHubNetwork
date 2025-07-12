-- Machine Templates Database Setup (Clean Version)
-- Run this in your Supabase SQL Editor

-- Create the update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create machine_categories table
CREATE TABLE IF NOT EXISTS machine_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create machine_templates table
CREATE TABLE IF NOT EXISTS machine_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category_id UUID REFERENCES machine_categories(id) ON DELETE RESTRICT,
    image_url TEXT,
    dimensions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create machine_template_slots table
CREATE TABLE IF NOT EXISTS machine_template_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_template_id UUID REFERENCES machine_templates(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    slot_number INTEGER NOT NULL,
    product_type_id UUID REFERENCES product_types(id) ON DELETE RESTRICT,
    mdb_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(machine_template_id, row_number, slot_number)
);

-- Create company_machine_templates table
CREATE TABLE IF NOT EXISTS company_machine_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    machine_template_id UUID REFERENCES machine_templates(id) ON DELETE CASCADE,
    custom_name TEXT,
    custom_dimensions TEXT,
    custom_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, machine_template_id)
);

-- Create company_machine_template_slots table
CREATE TABLE IF NOT EXISTS company_machine_template_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_machine_template_id UUID REFERENCES company_machine_templates(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    slot_number INTEGER NOT NULL,
    product_type_id UUID REFERENCES product_types(id) ON DELETE RESTRICT,
    mdb_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_machine_template_id, row_number, slot_number)
);

-- Enable Row Level Security
ALTER TABLE machine_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_template_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_machine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_machine_template_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for machine_categories
CREATE POLICY "Machine categories are viewable by all authenticated users" ON machine_categories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Machine categories can be managed by admins" ON machine_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- RLS Policies for machine_templates
CREATE POLICY "Machine templates are viewable by all authenticated users" ON machine_templates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Machine templates can be managed by admins" ON machine_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- RLS Policies for machine_template_slots
CREATE POLICY "Machine template slots are viewable by all authenticated users" ON machine_template_slots
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Machine template slots can be managed by admins" ON machine_template_slots
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- RLS Policies for company_machine_templates
CREATE POLICY "Users can view their own company machine templates" ON company_machine_templates
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own company machine templates" ON company_machine_templates
    FOR ALL USING (
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

-- RLS Policies for company_machine_template_slots
CREATE POLICY "Users can view their own company machine template slots" ON company_machine_template_slots
    FOR SELECT USING (
        company_machine_template_id IN (
            SELECT cmt.id FROM company_machine_templates cmt
            JOIN users u ON cmt.company_id = u.company_id
            WHERE u.id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own company machine template slots" ON company_machine_template_slots
    FOR ALL USING (
        company_machine_template_id IN (
            SELECT cmt.id FROM company_machine_templates cmt
            JOIN users u ON cmt.company_id = u.company_id
            WHERE u.id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'operator'
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_machine_templates_category_id ON machine_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_machine_template_slots_template_id ON machine_template_slots(machine_template_id);
CREATE INDEX IF NOT EXISTS idx_machine_template_slots_row_slot ON machine_template_slots(row_number, slot_number);
CREATE INDEX IF NOT EXISTS idx_company_machine_templates_company_id ON company_machine_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_company_machine_templates_template_id ON company_machine_templates(machine_template_id);
CREATE INDEX IF NOT EXISTS idx_company_machine_template_slots_cmt_id ON company_machine_template_slots(company_machine_template_id);

-- Create triggers
CREATE TRIGGER update_machine_categories_updated_at 
    BEFORE UPDATE ON machine_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machine_templates_updated_at 
    BEFORE UPDATE ON machine_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_machine_templates_updated_at 
    BEFORE UPDATE ON company_machine_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 