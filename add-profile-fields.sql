-- Add Profile Fields to Companies Table
-- Migration to support operator profile customization

-- Add slogan field for company tagline
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS slogan TEXT;

-- Add profile_image_url field for large hero image
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Add comments to document the new fields
COMMENT ON COLUMN companies.slogan IS 'Company slogan or tagline displayed under company name on profile page';
COMMENT ON COLUMN companies.profile_image_url IS 'URL to large hero image for company profile page (operator/machine/vehicle photo)';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name IN ('slogan', 'profile_image_url')
ORDER BY column_name; 