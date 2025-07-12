-- Fix Machine Templates Table
-- Run this if you get "column machine_templates.image_url does not exist" error

-- Check if image_url column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'machine_templates' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE machine_templates ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Check if dimensions column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'machine_templates' 
        AND column_name = 'dimensions'
    ) THEN
        ALTER TABLE machine_templates ADD COLUMN dimensions TEXT;
    END IF;
END $$;

-- Check if updated_at column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'machine_templates' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE machine_templates ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Check if category_id column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'machine_templates' 
        AND column_name = 'category_id'
    ) THEN
        ALTER TABLE machine_templates ADD COLUMN category_id UUID REFERENCES machine_categories(id) ON DELETE RESTRICT;
    END IF;
END $$; 