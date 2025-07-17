# Nayax API Data Analysis & Scalable Architecture

## 📊 **Current Data Structure Analysis**

### **API Endpoint**
- **URL**: `https://lynx.nayax.com/operational/v1/machines/{MachineID}/lastSales`
- **Method**: GET
- **Authentication**: Bearer token
- **Response**: Array of transaction objects

### **Complete Transaction Fields** (Based on API Response)
```javascript
{
  TransactionID: 4624736424,           // Unique transaction identifier
  PaymentServiceTransactionID: null,   // External payment service ID
  PaymentServiceProviderName: 'Adyen', // Payment provider (Adyen, etc.)
  MachineID: 108572742,               // Nayax machine identifier
  MachineName: 'Barefoot Bay',        // Human-readable machine name
  // Additional fields discovered from API response:
  // - Product information (product name, category, etc.)
  // - Financial data (amount, currency, etc.)
  // - Timing data (transaction date/time)
  // - Location data (if available)
  // - Customer data (if available)
}
```

## 🏗️ **Proposed Scalable Architecture**

### **1. Data Storage Strategy**

#### **Option A: Real-time API Calls (Recommended)**
- **Pros**: Always fresh data, no storage overhead, no sync issues
- **Cons**: API rate limits, slower response times
- **Use Case**: Current day/week data, real-time dashboards

#### **Option B: Hybrid Approach (Best for Scalability)**
- **Real-time**: Current day data via API calls
- **Cached**: Historical data stored in Supabase
- **Sync**: Daily/weekly background jobs to update historical data

### **2. Database Schema Design**

#### **Core Tables**

```sql
-- Nayax Transactions (Historical Data)
CREATE TABLE nayax_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id BIGINT UNIQUE NOT NULL,           -- Nayax TransactionID
  machine_id BIGINT NOT NULL,                      -- Nayax MachineID
  customer_machine_id UUID REFERENCES customer_machines(id),
  company_id UUID REFERENCES companies(id),
  
  -- Transaction Details
  machine_name TEXT,                               -- Nayax MachineName
  payment_provider TEXT,                           -- PaymentServiceProviderName
  payment_service_transaction_id TEXT,             -- PaymentServiceTransactionID
  
  -- Financial Data
  amount DECIMAL(10,2),                            -- Transaction amount
  currency TEXT DEFAULT 'USD',
  
  -- Product Data
  product_name TEXT,                               -- Product sold
  product_category TEXT,                           -- Product category
  
  -- Timing
  transaction_time TIMESTAMP WITH TIME ZONE,       -- When transaction occurred
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexing
  INDEX idx_machine_time (machine_id, transaction_time),
  INDEX idx_customer_machine (customer_machine_id, transaction_time),
  INDEX idx_company_time (company_id, transaction_time)
);

-- Machine Sync Status
CREATE TABLE nayax_machine_sync (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_machine_id UUID REFERENCES customer_machines(id),
  machine_id BIGINT NOT NULL,                      -- Nayax MachineID
  last_sync_time TIMESTAMP WITH TIME ZONE,
  last_transaction_id BIGINT,                      -- Last processed transaction
  sync_status TEXT DEFAULT 'pending',              -- pending, syncing, completed, error
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **3. Data Flow Architecture**

#### **Real-time Data Flow**
```
Customer Dashboard → API Route → Nayax API → Process Data → Return to Client
```

#### **Historical Data Flow**
```
Background Job → Nayax API → Process Data → Store in Supabase → Serve from Database
```

### **4. API Route Structure**

#### **Current Day Data** (`/api/nayax/current-sales`)
- Real-time API calls to Nayax
- No caching, always fresh
- Used for: Today's sales, real-time dashboards

#### **Historical Data** (`/api/nayax/historical-sales`)
- Serve from Supabase database
- Fast response times
- Used for: Weekly/monthly reports, trend analysis

#### **Data Sync** (`/api/nayax/sync`)
- Background job to update historical data
- Run daily/weekly
- Update `nayax_transactions` table

### **5. Performance Optimization**

#### **Caching Strategy**
- **Redis Cache**: Store frequently accessed data (daily totals, machine summaries)
- **Database Indexes**: Optimize queries by machine, date, company
- **API Response Caching**: Cache Nayax API responses for 5-15 minutes

#### **Query Optimization**
- **Pagination**: Limit results to 100-500 transactions per request
- **Date Range Limits**: Max 30 days for real-time, unlimited for historical
- **Aggregation**: Pre-calculate daily/weekly totals

### **6. Error Handling & Monitoring**

#### **API Failures**
- Retry logic with exponential backoff
- Fallback to cached data when API is unavailable
- Alert system for repeated failures

#### **Data Quality**
- Validation of transaction data
- Duplicate detection and handling
- Missing data handling

### **7. Security Considerations**

#### **Token Management**
- Secure storage of Nayax API tokens
- Token rotation and expiration handling
- Access control by company/machine

#### **Data Access**
- Row Level Security (RLS) policies
- Company-specific data isolation
- Audit logging for data access

## 🚀 **Implementation Phases**

### **Phase 1: Basic Integration**
1. ✅ API test and data structure analysis
2. 🔄 Real-time data display in Machine Sales page
3. 📊 Basic charts with current data

### **Phase 2: Historical Data**
1. 🗄️ Database schema implementation
2. 🔄 Background sync jobs
3. 📈 Historical charts and reports

### **Phase 3: Optimization**
1. ⚡ Caching implementation
2. 🔍 Advanced filtering and search
3. 📱 Mobile optimization

### **Phase 4: Advanced Features**
1. 🤖 Automated insights and alerts
2. 📊 Advanced analytics
3. 🔗 Integration with other systems

## 📋 **Next Steps**

1. **Run enhanced API test** to get complete field analysis
2. **Design database schema** based on actual data structure
3. **Implement real-time data display** in Machine Sales page
4. **Create data processing utilities** for transforming Nayax data
5. **Set up background sync jobs** for historical data

## 🔍 **Questions to Resolve**

1. **Data Retention**: How long should we keep historical transaction data?
2. **Rate Limits**: What are Nayax API rate limits and how to handle them?
3. **Data Volume**: Expected transaction volume per machine per day?
4. **Real-time Requirements**: How real-time does the data need to be?
5. **Backup Strategy**: How to handle Nayax API downtime? 