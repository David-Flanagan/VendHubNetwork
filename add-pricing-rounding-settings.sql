-- Add Pricing Rounding Settings to Companies Table
-- This adds the rounding direction and increment settings for price calculations

-- Add new columns to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS price_rounding_direction TEXT DEFAULT 'up' CHECK (price_rounding_direction IN ('up', 'down')),
ADD COLUMN IF NOT EXISTS price_rounding_increment DECIMAL(3,2) DEFAULT 0.25 CHECK (price_rounding_increment IN (0.05, 0.10, 0.25, 0.50));

-- Add comments for documentation
COMMENT ON COLUMN companies.price_rounding_direction IS 'Direction for price rounding: up or down';
COMMENT ON COLUMN companies.price_rounding_increment IS 'Increment for price rounding: 0.05, 0.10, 0.25, or 0.50';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_companies_pricing_settings ON companies(processing_fee_percentage, sales_tax_percentage, price_rounding_direction, price_rounding_increment);

-- Update existing companies with default values if they don't have them
UPDATE companies 
SET 
  price_rounding_direction = 'up',
  price_rounding_increment = 0.25
WHERE price_rounding_direction IS NULL OR price_rounding_increment IS NULL;

-- Verify the changes
SELECT 
  id, 
  name, 
  processing_fee_percentage, 
  sales_tax_percentage, 
  price_rounding_direction, 
  price_rounding_increment
FROM companies 
LIMIT 5; 