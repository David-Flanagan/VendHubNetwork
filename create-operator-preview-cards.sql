-- Create operator_preview_cards table
CREATE TABLE IF NOT EXISTS operator_preview_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  display_name VARCHAR(50) NOT NULL,
  description VARCHAR(200) NOT NULL,
  location_name VARCHAR(100) NOT NULL,
  logo_url TEXT,
  machine_count INTEGER DEFAULT 0,
  member_since TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_operator_preview_cards_company_id ON operator_preview_cards(company_id);
CREATE INDEX IF NOT EXISTS idx_operator_preview_cards_created_at ON operator_preview_cards(created_at);

-- Create unique constraint to ensure one preview card per company
ALTER TABLE operator_preview_cards ADD CONSTRAINT unique_company_preview_card UNIQUE (company_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_operator_preview_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_operator_preview_cards_updated_at
  BEFORE UPDATE ON operator_preview_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_operator_preview_cards_updated_at();

-- Create trigger to update machine count when customer_machines change
CREATE OR REPLACE FUNCTION update_operator_preview_card_machine_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update machine count for the operator company
  IF TG_OP = 'INSERT' THEN
    UPDATE operator_preview_cards 
    SET machine_count = machine_count + 1
    WHERE company_id = NEW.operator_company_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE operator_preview_cards 
    SET machine_count = GREATEST(machine_count - 1, 0)
    WHERE company_id = OLD.operator_company_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If operator_company_id changed
    IF OLD.operator_company_id != NEW.operator_company_id THEN
      -- Decrease count for old operator
      UPDATE operator_preview_cards 
      SET machine_count = GREATEST(machine_count - 1, 0)
      WHERE company_id = OLD.operator_company_id;
      
      -- Increase count for new operator
      UPDATE operator_preview_cards 
      SET machine_count = machine_count + 1
      WHERE company_id = NEW.operator_company_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on customer_machines table
CREATE TRIGGER trigger_update_operator_preview_card_machine_count
  AFTER INSERT OR UPDATE OR DELETE ON customer_machines
  FOR EACH ROW
  EXECUTE FUNCTION update_operator_preview_card_machine_count();

-- Enable RLS
ALTER TABLE operator_preview_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Operators can view their own preview card
CREATE POLICY "Operators can view own preview card" ON operator_preview_cards
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Operators can insert their own preview card
CREATE POLICY "Operators can insert own preview card" ON operator_preview_cards
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Operators can update their own preview card
CREATE POLICY "Operators can update own preview card" ON operator_preview_cards
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Operators can delete their own preview card
CREATE POLICY "Operators can delete own preview card" ON operator_preview_cards
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Public can view all preview cards (for featured operators section)
CREATE POLICY "Public can view all preview cards" ON operator_preview_cards
  FOR SELECT USING (true);

-- Admins can do everything
CREATE POLICY "Admins can do everything" ON operator_preview_cards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Grant permissions
GRANT ALL ON operator_preview_cards TO authenticated;
GRANT SELECT ON operator_preview_cards TO anon; 