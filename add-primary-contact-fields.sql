-- Add primary contact fields to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS primary_contact_name TEXT,
ADD COLUMN IF NOT EXISTS primary_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS primary_contact_email TEXT;

-- Add comment for documentation
COMMENT ON COLUMN companies.primary_contact_name IS 'Primary contact person name for the company';
COMMENT ON COLUMN companies.primary_contact_phone IS 'Primary contact phone number for the company';
COMMENT ON COLUMN companies.primary_contact_email IS 'Primary contact email address for the company'; 