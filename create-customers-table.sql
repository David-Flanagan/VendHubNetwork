-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_name TEXT NOT NULL,
  business_type TEXT,
  employee_count_range TEXT CHECK (employee_count_range IN ('1-10', '11-50', '51-200', '200+')),
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint on user_id
CREATE UNIQUE INDEX IF NOT EXISTS customers_user_id_idx ON customers(user_id);

-- Create index on coordinates for distance calculations
CREATE INDEX IF NOT EXISTS customers_coordinates_idx ON customers(latitude, longitude);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers table
-- Customers can only see their own data
CREATE POLICY "Customers can view own data" ON customers
  FOR SELECT USING (
    auth.uid() = user_id AND 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND role = 'customer'
    )
  );

-- Customers can insert their own data
CREATE POLICY "Customers can insert own data" ON customers
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND role = 'customer'
    )
  );

-- Customers can update their own data
CREATE POLICY "Customers can update own data" ON customers
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND role = 'customer'
    )
  );

-- Customers can delete their own data
CREATE POLICY "Customers can delete own data" ON customers
  FOR DELETE USING (
    auth.uid() = user_id AND 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND role = 'customer'
    )
  );

-- Operators can view customer data for service area matching
CREATE POLICY "Operators can view customer data for matching" ON customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND role = 'operator'
    )
  );

-- Admins can view all customer data
CREATE POLICY "Admins can view all customer data" ON customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at(); 