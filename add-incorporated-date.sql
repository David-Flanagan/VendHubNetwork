-- Add incorporated_date field to companies table
ALTER TABLE companies ADD COLUMN incorporated_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN companies.incorporated_date IS 'The date when the company was officially incorporated';

-- Update existing companies to have a default incorporated date (optional)
-- UPDATE companies SET incorporated_date = created_at WHERE incorporated_date IS NULL; 