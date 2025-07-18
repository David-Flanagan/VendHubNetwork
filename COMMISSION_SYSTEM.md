# VendHub Commission System

## Overview

The VendHub Commission System is a comprehensive solution for calculating and managing commission payments between vending machine operators and their customers. The system handles both direct machine sales commissions and referral-based commissions, with a complete cashout management system.

## System Architecture

### Core Components

1. **Commission API** (`/api/customer-machine-commission`)
   - Calculates commission totals for customers
   - Supports operator-specific filtering
   - Handles both machine sales and referral commissions
   - Excludes failed transactions from commission calculations

2. **Operator Cashout Page** (`/customers/dashboard/operator-cashout`)
   - Operator-specific commission management
   - Cashout request interface
   - Commission breakdown display
   - Payout method selection

3. **Commission Dashboard** (`/customers/dashboard/commission`)
   - Aggregated commission overview
   - Multi-operator commission totals
   - Key metrics display
   - Available balance calculation

4. **Cashout Management System**
   - Payout request creation and tracking
   - Operator payout settings management
   - Cashout history and status tracking

## Database Schema

### Key Tables

#### `customer_machines`
- Links customers to operators (companies)
- Stores slot configuration with commission data
- Contains approval and onboarding status

#### `nayax_transactions`
- Stores actual vending machine transactions
- Links to customer machines via `customer_machine_id`
- Contains product information and sales amounts
- Includes `transaction_status` field for failed transaction filtering

#### `companies`
- Operator/company information
- Used for operator filtering and display

#### `payout_methods`
- Available payout methods (PayPal, Bank Transfer, Check, etc.)
- Processing fees and minimum amounts
- Active/inactive status

#### `operator_payout_settings`
- Operator-specific payout configurations
- Enabled payout methods
- Custom fee structures and minimum cashout amounts

#### `payout_requests`
- Customer cashout requests
- Status tracking (pending, approved, completed, rejected)
- Amount and fee calculations
- Request and processing timestamps

### Slot Configuration Structure

The slot configuration is stored as JSONB with a nested structure:

```json
{
  "rows": [
    {
      "slots": [
        {
          "mdb_code": "1",
          "product_name": "Sport SPF 50",
          "base_price": 11.00,
          "final_price": 13.50,
          "commission_amount": 2.20,
          "commission_rate": 20,
          "sales_tax_amount": 0.143,
          "processing_fee_amount": 0.055
        }
      ],
      "row_number": 1
    }
  ]
}
```

## Commission Calculation Logic

### Machine Sales Commission

1. **Transaction Processing**
   - Parse product names to extract MDB codes: `"Sport SPF 30(2 = 0.15)"` → MDB code "2"
   - Match MDB codes with slot configuration
   - Sum commission amounts from matched products
   - **Exclude failed transactions** (status = 'Failed' or 'failed')

2. **Commission Sources**
   - Direct commission amounts from slot configuration
   - Based on pre-calculated commission rates and base prices
   - Includes processing fees and sales tax calculations

### Referral Commission

1. **Referral Tracking**
   - Uses `customer_referrals` table (to be implemented)
   - Tracks customer-to-customer referrals
   - Calculates commission on referred customers' machine sales

2. **Calculation Method**
   - Base price × referral commission percentage
   - Applied to transactions from referred customers' machines

### Available Balance Calculation

The available balance is calculated as:
```
Available Balance = Lifetime Earnings - Completed Cashouts - Pending Cashouts
```

This ensures that:
- Pending cashout requests reduce available balance immediately
- Approved but not yet processed cashouts remain pending
- Only completed cashouts are permanently deducted

## API Endpoints

### POST `/api/customer-machine-commission`

**Request Body:**
```json
{
  "customerId": "uuid",
  "operatorId": "uuid" // optional
}
```

**Response:**
```json
{
  "machineSalesCommission": 20.80,
  "referralCommission": 0.00,
  "totalCommission": 20.80,
  "totalProductsSold": 1.20,
  "totalTransactions": 9,
  "machineCount": 1,
  "availableBalance": 18.50,
  "pendingCashouts": 2.30,
  "completedCashouts": 0.00,
  "lifetimeEarnings": 20.80,
  "commissionBreakdown": [
    {
      "machineId": "uuid",
      "machineName": "Barefoot Bay - Pool 1",
      "companyName": "Beach Box Florida",
      "commissionType": "Machine Sales",
      "commission": 20.80,
      "productsSold": 1.20,
      "transactions": 9
    }
  ]
}
```

### POST `/api/customer-cashout-request`

**Request Body:**
```json
{
  "customerId": "uuid",
  "operatorId": "uuid",
  "amount": 50.00,
  "payoutMethodId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "requestId": "uuid",
  "amount": 50.00,
  "processingFee": 2.50,
  "netAmount": 47.50
}
```

## Recent Fixes and Improvements

### 1. Slot Configuration Parsing Fix

**Problem**: Commission calculation was returning $0 because the code expected a flat array structure for slot configuration, but the actual structure is nested with `rows[].slots[]`.

**Solution**: Updated the parsing logic to handle the correct nested structure:

```javascript
// Before (incorrect)
if (slotConfig && Array.isArray(slotConfig)) {
  const product = slotConfig.find((p: any) => p.mdb_code === mdbCode)
}

// After (correct)
if (slotConfig && slotConfig.rows && Array.isArray(slotConfig.rows)) {
  const slots = slotConfig.rows.flatMap((row: any) => row.slots || [])
  const product = slots.find((p: any) => p.mdb_code === mdbCode)
}
```

### 2. Failed Transaction Handling

**Problem**: Failed transactions were being included in commission calculations, causing inaccurate totals.

**Solution**: 
- Updated all commission APIs to exclude failed transactions
- Added optional toggle in machine sales page to view failed transactions
- Implemented proper query syntax for excluding multiple status values

```javascript
// Correct syntax for excluding failed transactions
.not('transaction_status', 'eq', 'Failed')
.not('transaction_status', 'eq', 'failed')
```

### 3. Available Balance Calculation

**Problem**: Available balance wasn't properly accounting for pending cashout requests.

**Solution**: Updated calculation to include both completed and pending cashouts:
```javascript
const availableBalance = lifetimeEarnings - completedCashouts - pendingCashouts
```

### 4. Date Format Standardization

**Problem**: Inconsistent date formats across the application.

**Solution**: Standardized all dates to American format (MM/DD/YYYY) using:
```javascript
const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  })
}
```

## User Interface

### Commission Dashboard
- **Available Commission**: Total commission ready for cashout (lifetime - completed - pending)
- **Total Products Sold**: Aggregated product sales across all operators
- **Total Transactions**: Number of completed transactions (excluding failed)
- **Machine Count**: Number of active machines

### Operator Cashout Page
- **Operator Selection**: Choose specific operator for detailed view
- **Commission Metrics**: Operator-specific commission totals
- **Payout Information**: Available payout methods and fee structures
- **Cashout Actions**: Request cashout functionality with amount input
- **Fee Breakdown**: Shows processing fees and net payout amount

### Machine Sales Page
- **Transaction List**: All successful transactions with commission details
- **Failed Transaction Toggle**: Optional view of failed transactions (doesn't affect commission)
- **Commission Summary**: Per-machine commission breakdown
- **Date Filtering**: American date format with default to today

### Cashout Management
- **Operator Cashout Management**: View and approve/reject cashout requests
- **Customer Cashout History**: Track request status and payment history
- **Payout Settings**: Configure payout methods and fee structures

## Cashout System

### Payout Methods
- **PayPal**: Instant transfers with 5% processing fee
- **Bank Transfer**: 2-3 business days with $2.50 flat fee
- **Check**: 5-7 business days with $1.00 processing fee
- **Cash Pickup**: No fees, requires operator coordination

### Cashout Process
1. **Request Creation**: Customer submits cashout request with amount and method
2. **Fee Calculation**: System calculates processing fees based on method
3. **Balance Verification**: Ensures available balance covers request amount
4. **Operator Review**: Operator can approve, reject, or modify requests
5. **Payment Processing**: Manual or automated payment execution
6. **Status Updates**: Real-time status tracking throughout the process

### Fee Structure
```javascript
const feeStructure = {
  paypal: { percentage: 5, minimum: 0 },
  bank_transfer: { flat: 2.50, minimum: 0 },
  check: { flat: 1.00, minimum: 0 },
  cash_pickup: { percentage: 0, minimum: 0 }
}
```

## Future Enhancements

### Planned Features
1. **Stripe Connect Integration**
   - Automated payouts
   - Fee handling
   - Payment tracking
   - Tax documentation

2. **Enhanced Referral System**
   - Create `customer_referrals` table
   - Implement referral tracking
   - Calculate referral commissions
   - Referral analytics dashboard

3. **Advanced Analytics**
   - Commission trend analysis
   - Performance metrics
   - Revenue forecasting
   - Machine profitability analysis

4. **Mobile Optimization**
   - Responsive commission dashboard
   - Mobile cashout requests
   - Push notifications for status updates

### Database Improvements
```sql
-- Enhanced referral system
CREATE TABLE customer_referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES users(id),
  referred_id UUID REFERENCES users(id),
  referral_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active',
  commission_earned DECIMAL(10,2) DEFAULT 0,
  last_commission_date TIMESTAMP WITH TIME ZONE
);

-- Commission history tracking
CREATE TABLE commission_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES users(id),
  machine_id UUID REFERENCES customer_machines(id),
  transaction_id UUID REFERENCES nayax_transactions(id),
  commission_amount DECIMAL(10,2),
  commission_type TEXT,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Testing and Validation

### Commission Calculation Verification
The system correctly calculates commissions based on:
- 9 transactions × average $2.31 commission = $20.80 total
- Individual product commissions: $2.20, $2.40, $2.40
- Proper MDB code matching between transactions and slot configuration
- Failed transactions properly excluded from calculations

### Data Integrity
- All transactions properly linked to customer machines
- Slot configuration contains accurate commission amounts
- Operator filtering works correctly
- Commission breakdown provides detailed transparency
- Cashout requests properly track status and amounts

### Error Handling
- Comprehensive logging for debugging
- Graceful handling of missing data
- Validation of all user inputs
- Clear error messages for users

## Security and Access Control

### Row Level Security (RLS)
- Customers can only view their own commission data
- Operators can only view commission data for their machines
- Admins have full access to all commission data
- Payout requests are properly scoped to customer-operator relationships

### API Security
- Service role key used for database access
- Customer ID validation on all requests
- Operator filtering prevents cross-operator data access
- Input validation and sanitization

## Performance Considerations

### Optimization Strategies
1. **Indexed Queries**: Customer machine and transaction lookups are indexed
2. **Efficient Joins**: Direct relationships between tables
3. **Caching**: Consider Redis for frequently accessed commission data
4. **Pagination**: For large transaction datasets
5. **Query Optimization**: Proper filtering and limiting

### Monitoring
- API response times (target: <2 seconds for typical queries)
- Database query performance
- Commission calculation accuracy
- Error handling and logging
- Cashout request processing times

## Troubleshooting

### Common Issues
1. **Zero Commission**: Check slot configuration structure and MDB code matching
2. **Missing Transactions**: Verify `customer_machine_id` links and transaction status
3. **Incorrect Totals**: Validate commission amounts in slot configuration
4. **Failed Transaction Errors**: Check query syntax for status exclusions
5. **Cashout Balance Issues**: Verify pending vs completed cashout calculations

### Debug Tools
- Detailed API logging with request/response data
- Frontend debug information display
- Database query validation
- Commission breakdown analysis
- Cashout request status tracking

### Error Resolution Steps
1. **Check API Logs**: Review detailed error messages
2. **Validate Database**: Ensure tables and relationships exist
3. **Test Queries**: Verify SQL syntax and data integrity
4. **Clear Cache**: Refresh browser and clear any cached data
5. **Check Permissions**: Verify RLS policies and user access

## Conclusion

The VendHub Commission System provides a robust foundation for managing vending machine commissions with a complete cashout management system. Recent fixes ensure accurate calculations across all machine types and operators, while the cashout system provides flexible payment options with proper fee handling and status tracking. The system is designed to scale with additional features like automated payouts and enhanced referral tracking. 