# Machine Templates System Redesign

## 🎯 **Overview**
We're completely redesigning the machine template system from an over-engineered 9-table structure to a clean 3-table system.

## 🗑️ **Step 1: Cleanup (cleanup-machine-templates-system.sql)**
This script removes all existing data and old tables:
- Deletes all customer machine data
- Deletes all company machine template data  
- Deletes all global machine template data
- Drops old complex tables:
  - `machine_template_slots`
  - `machine_template_slot_product_types`
  - `company_machine_templates`
  - `company_machine_template_slots`
  - `company_machine_template_slot_product_types`
  - `customer_machines` (old version)
  - `customer_machine_products`

## 🏗️ **Step 2: New 3-Table System (new-machine-templates-system.sql)**

### **1. `global_machine_templates`**
- **Purpose**: Global repository of machine templates
- **Created by**: Admins and Operators
- **Content**: Machine specs, images, slot configuration JSON
- **Key Fields**:
  - `slot_configuration JSONB` - New JSON structure for slot layout
  - `created_by` - Tracks who created the template

### **2. `company_machine_templates`**
- **Purpose**: Operator's customized copies of global templates
- **Created by**: Operators copying from global catalog
- **Content**: Complete copy of global template data (fully editable)
- **Key Fields**:
  - `is_available_for_customers` - Simple toggle for customer visibility
  - Complete copy of all global template fields

### **3. `customer_machines`**
- **Purpose**: Customer's machine placements with product selections
- **Created by**: Customers during onboarding
- **Content**: Based on company machine template + customer decisions
- **Key Fields**:
  - `slot_configuration JSONB` - Complete product data + pricing
  - Host location information
  - Onboarding and approval status

## 🔄 **Data Flow**
```
Global Template → Company Copy → Customer Placement
     ↓              ↓              ↓
Admin/Operator   Operator copies  Customer selects
creates template & customizes     products & sets
with JSON slots  for their        commission rates
                 company
```

## 📋 **JSON Slot Configuration Structure**

### **Global/Company Templates:**
```json
{
  "slots": [
    {
      "slot_id": "A1",
      "row": 1,
      "column": 1,
      "allowed_product_types": ["snacks", "beverages"]
    }
  ]
}
```

### **Customer Machines:**
```json
{
  "slots": [
    {
      "slot_id": "A1",
      "row": 1,
      "column": 1,
      "allowed_product_types": ["snacks", "beverages"],
      "selected_product": {
        "company_product_id": "uuid-here",
        "product_name": "Doritos Nacho Cheese",
        "product_image_url": "https://storage.../doritos.jpg",
        "base_price": 1.50,
        "customer_commission_rate": 15.00,
        "final_price": 1.73,
        "commission_amount": 0.23,
        "tax_amount": 0.14,
        "processing_fee_amount": 0.05,
        "product_type": "snacks"
      }
    }
  ]
}
```

## ✅ **Benefits of New System**

1. **Simplified Relationships**: Clear, linear flow
2. **Data Independence**: Each level has complete data set
3. **No Broken References**: Global template changes don't affect company copies
4. **Price Stability**: Customer prices never change
5. **Easy Maintenance**: Simple, clear data structure
6. **Future-Ready**: Supports product changes and sales tracking

## 🚀 **Next Steps**

1. **Run cleanup script** to remove old system
2. **Run new system script** to create 3-table structure
3. **Redesign admin machine template builder** to collect JSON slot data
4. **Redesign operator interface** for copying templates
5. **Redesign customer onboarding** to use new data structure

## 🔒 **Security & Permissions**

- **Global Templates**: Admins and operators can create/manage
- **Company Templates**: Operators can manage their own
- **Customer Machines**: Customers manage during onboarding, operators can approve

## 📊 **Performance**

- **Indexed Fields**: All key lookup fields are indexed
- **JSON Queries**: Efficient JSONB queries for slot configurations
- **Minimal Joins**: Simple queries with few table joins 