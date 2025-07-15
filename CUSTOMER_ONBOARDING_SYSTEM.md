# Customer Onboarding System Documentation

## Overview

The customer onboarding system allows customers to set up vending machines with operators through a streamlined 4-step process. The system uses a 3-table machine template architecture and stores complete product configurations with pricing in the `customer_machines` table.

## Database Architecture

### Customer Machines Table

The `customer_machines` table stores customer machine placements with complete product selections and pricing data:

```sql
CREATE TABLE customer_machines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Customer and Operator Relationship
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    company_machine_template_id UUID REFERENCES company_machine_templates(id) ON DELETE CASCADE,
    
    -- Machine Information
    machine_name TEXT NOT NULL,
    machine_image_url TEXT,
    machine_dimensions TEXT,
    slot_count INTEGER NOT NULL,
    
    -- Complete Product Configuration with Pricing
    slot_configuration JSONB NOT NULL, -- Contains complete product data + pricing
    
    -- Host Location Information
    host_business_name TEXT NOT NULL,
    machine_placement_area TEXT NOT NULL,
    host_address TEXT NOT NULL,
    host_latitude DECIMAL(10,8),
    host_longitude DECIMAL(11,8),
    
    -- Point of Contact
    point_of_contact_name TEXT NOT NULL,
    point_of_contact_position TEXT NOT NULL,
    point_of_contact_email TEXT NOT NULL,
    point_of_contact_phone TEXT,
    
    -- Onboarding Status
    onboarding_status TEXT NOT NULL DEFAULT 'in_progress' 
        CHECK (onboarding_status IN ('in_progress', 'completed', 'abandoned')),
    current_step INTEGER NOT NULL DEFAULT 1 
        CHECK (current_step BETWEEN 1 AND 4),
    
    -- Approval Process
    approval_status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);
```

### Slot Configuration JSON Structure

The `slot_configuration` field contains the complete product setup with pricing:

```json
{
  "rows": [
    {
      "row_number": 1,
      "slots": [
        {
          "slot_number": 1,
          "alias": "A1",
          "mdb_code": "001",
          "product_name": "Coca-Cola",
          "brand_name": "Coca-Cola",
          "description": "12oz can",
          "image_url": "https://...",
          "base_price": 1.50,
          "commission_rate": 15.0,
          "commission_amount": 0.23,
          "final_price": 1.75,
          "processing_fee_amount": 0.05,
          "sales_tax_amount": 0.14,
          "rounding_difference": 0.01,
          "company_product_id": "uuid",
          "product_type_id": "uuid",
          "processing_fee_percentage": 2.90,
          "sales_tax_percentage": 8.25
        }
      ]
    }
  ]
}
```

## Onboarding Process

### Step 1: Machine and Operator Selection
- Customer selects an operator/company
- Customer chooses from available machine templates
- System loads company machine templates that are marked as available for customers

**Key Features:**
- Browse operators with available machines
- View machine templates with categories and specifications
- Select machine template to proceed

### Step 2: Product Configuration
- Customer configures products for each slot in the machine
- Set commission rates (0% to 50% in 0.5% increments)
- Real-time pricing calculation with processing fees and sales tax
- Bulk or individual commission mode

**Key Features:**
- Product card grid interface
- Commission slider with live pricing updates
- Bulk commission application
- Processing fee and sales tax calculation
- Price rounding (up/down to nearest 0.05, 0.10, 0.25, or 0.50)

### Step 3: Location and Contact Setup
- Enter host business information
- Set machine placement area
- Provide point of contact details
- Automatic geocoding for address coordinates

**Key Features:**
- Host business name and placement area
- Address input with automatic geocoding
- Point of contact information (name, position, email, phone)
- Google Maps integration for coordinate validation

### Step 4: Final Review and Submission
- Review all configuration details
- Confirm operator information
- Submit onboarding request for approval

**Key Features:**
- Complete review of all steps
- Operator contact information display
- Machine template confirmation
- Product configuration summary
- Location and contact verification

## Pricing Calculation

The system calculates final pricing using the following formula:

1. **Base Price**: Operator's base product price
2. **Commission**: Customer's commission rate (0-50%)
3. **Processing Fee**: Company's processing fee percentage
4. **Sales Tax**: Applicable sales tax percentage
5. **Rounding**: Applied according to company settings

**Formula:**
```
Commission Amount = Base Price × (Commission Rate / 100)
Processing Fee Amount = Base Price × (Processing Fee % / 100)
Sales Tax Amount = Base Price × (Sales Tax % / 100)
Final Price = Base Price + Commission Amount + Processing Fee Amount + Sales Tax Amount
Final Price = Round(Final Price) // According to company rounding settings
```

## File Structure

```
src/
├── app/
│   └── customers/
│       └── onboarding/
│           └── page.tsx                    # Main onboarding controller
├── components/
│   └── customers/
│       └── onboarding/
│           ├── OnboardingStep1.tsx         # Machine/operator selection
│           ├── OnboardingStep2.tsx         # Product configuration
│           ├── OnboardingStep3.tsx         # Location setup
│           └── OnboardingStep4.tsx         # Final review
└── lib/
    └── pricing-utils.ts                    # Pricing calculation functions
```

## Key Components

### OnboardingPage (page.tsx)
- Manages the 4-step flow
- Handles data persistence between steps
- Submits final onboarding data to database
- Creates customer_machines record with complete configuration

### OnboardingStep1
- Loads available company machine templates
- Displays machine selection interface
- Handles template selection

### OnboardingStep2
- Product configuration with commission setting
- Real-time pricing calculation
- Bulk and individual commission modes
- Product card grid interface

### OnboardingStep3
- Location and contact information collection
- Google Maps integration for geocoding
- Form validation and data collection

### OnboardingStep4
- Final review and confirmation
- Displays all collected information
- Handles final submission

### Pricing Utils
- `calculateVendingPrice()`: Main pricing calculation
- `applyRounding()`: Price rounding logic
- `formatPrice()`: Price formatting utilities

## Database Constraints

### Current Step Constraint
```sql
CHECK (current_step BETWEEN 1 AND 4)
```

### Onboarding Status Constraint
```sql
CHECK (onboarding_status IN ('in_progress', 'completed', 'abandoned'))
```

### Approval Status Constraint
```sql
CHECK (approval_status IN ('pending', 'approved', 'rejected'))
```

## Row Level Security (RLS)

### Customer Access
- Customers can view and manage their own machines
- Access during onboarding and after completion

### Operator Access
- Operators can view machines for their company
- Can update approval status
- Can manage machine configurations

## Workflow

1. **Customer initiates onboarding** via operator profile or browse page
2. **Step 1**: Select machine template from operator's catalog
3. **Step 2**: Configure products and commission rates
4. **Step 3**: Provide location and contact information
5. **Step 4**: Review and submit for approval
6. **System creates customer_machines record** with complete configuration
7. **Operator receives notification** of pending approval request
8. **Operator reviews and approves/rejects** the machine setup
9. **Customer receives notification** of approval status

## Error Handling

- **Validation errors**: Form validation with user-friendly messages
- **Database errors**: Graceful error handling with retry options
- **Network errors**: Connection error handling and recovery
- **Geocoding errors**: Fallback for address coordinate lookup

## Future Enhancements

- **Multi-machine onboarding**: Support for multiple machines in single session
- **Template customization**: Allow customers to modify machine templates
- **Bulk product import**: Import product lists from spreadsheets
- **Advanced pricing**: Volume discounts and promotional pricing
- **Integration**: Connect with inventory and payment systems 