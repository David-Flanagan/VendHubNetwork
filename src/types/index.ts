// User Roles
export type UserRoleType = 'admin' | 'operator' | 'customer'

// Customer specific types
export type EmployeeCountRange = '1-10' | '11-50' | '51-200' | '200+'

export interface Customer {
  id: string
  user_id: string
  business_name: string
  business_type?: string
  employee_count_range?: EmployeeCountRange
  address: string
  latitude?: number
  longitude?: number
  created_at: string
  updated_at: string
}

export interface CustomerFormData {
  business_name: string
  business_type?: string
  employee_count_range?: EmployeeCountRange
  address: string
  latitude?: number
  longitude?: number
}

// User Profile
export interface UserProfile {
  id: string
  email: string
  role: UserRoleType
  created_at: string
  updated_at: string
}

// Admin specific types
export interface ProductCategory {
  id: string
  name: string
  description?: string
  created_at: string
}

export interface GlobalProduct {
  id: string
  brand_name: string
  product_name: string
  description?: string
  product_type_id: string
  product_category_id: string
  image_url?: string
  created_at: string
  updated_at: string
}

export interface MachineTemplate {
  id: string
  name: string
  description?: string
  category: string
  slot_count: number
  created_at: string
  updated_at: string
}

export interface VendingCategory {
  id: string
  name: string
  description?: string
  created_at: string
}

export interface ProductType {
  id: string
  name: string
  description?: string
  created_at: string
}

// Company Product (junction between company and global product)
export interface CompanyProduct {
  id: string
  company_id: string
  global_product_id: string
  price: number
  is_available: boolean
  created_at: string
  updated_at: string
  global_product?: GlobalProduct
}

// Service Areas
export type ServiceAreaMethod = 'polygon'

export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: number[][][]
}

export interface ServiceArea {
  id: string
  company_id: string
  name?: string
  method: ServiceAreaMethod
  
  // For polygon method only (radius method was removed)
  polygon_geometry?: GeoJSONPolygon
  
  created_at: string
  updated_at: string
}

export interface ServiceAreaFormData {
  name?: string
  method: ServiceAreaMethod
  polygon_geometry?: GeoJSONPolygon
}

// Company Profile
export interface Company {
  id: string
  name: string
  description?: string
  slogan?: string
  contact_email?: string
  contact_phone?: string
  address?: string
  website?: string
  logo_url?: string
  profile_image_url?: string
  latitude?: number
  longitude?: number

  map_enabled?: boolean
  incorporated_date?: string
  processing_fee_percentage?: number
  sales_tax_percentage?: number
  price_rounding_direction?: 'up' | 'down'
  price_rounding_increment?: number
  sections_config?: {
    [key: string]: {
      enabled: boolean
      mandatory: boolean
      order: number
    }
  }
  service_areas?: ServiceArea[]
  created_at: string
  updated_at: string
}

// User Role
export interface UserRole {
  id: string
  user_id: string
  role: UserRoleType
  created_at: string
}

// Machine Gallery
export interface MachineGalleryImage {
  id: string
  company_id: string
  image_url: string
  caption?: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Customer Onboarding & Machine Management
export interface CustomerMachine {
  id: string
  customer_id: string
  company_id: string
  company_machine_template_id: string
  
  // Machine Information
  machine_name: string
  machine_image_url?: string
  machine_dimensions?: string
  slot_count: number
  
  // Customer's slot configuration with product selections and pricing
  slot_configuration: any // JSONB field with complete product data + pricing
  
  // Host Location Information
  host_business_name: string
  machine_placement_area: string
  host_address: string
  host_latitude?: number
  host_longitude?: number
  point_of_contact_name: string
  point_of_contact_position: string
  point_of_contact_email: string
  point_of_contact_phone?: string
  
  // Commission Settings
  default_commission_rate: number
  processing_fee_percentage: number
  sales_tax_percentage: number
  
  // Approval Process
  approval_status: 'pending' | 'approved' | 'rejected' | 'abandoned'
  nayax_machine_id?: string
  approved_at?: string
  approved_by?: string
  rejection_reason?: string
  
  // Referral Information
  referral_user_id?: string
  referral_commission_percent?: number
  
  // Onboarding Status
  onboarding_status: 'in_progress' | 'completed' | 'abandoned'
  current_step: number
  
  // Timestamps
  created_at: string
  updated_at: string
  completed_at?: string
  
  // Joined data (optional)
  company?: {
    id: string
    name: string
    logo_url?: string
  }
  machine_template?: {
    id: string
    name: string
    description?: string
  }
}

export interface CustomerMachineProduct {
  id: string
  customer_machine_id: string
  
  // Slot and Product Information
  row_number: number
  slot_number: number
  product_type_id: string
  company_product_id: string
  
  // Pricing Information
  base_price: number
  commission_rate: number
  final_price: number
  
  // Calculations breakdown
  commission_amount: number
  processing_fee_amount: number
  sales_tax_amount: number
  
  created_at: string
}

export interface CustomerMachineFormData {
  // Step 1: Machine Selection
  company_machine_template_id?: string
  
  // Step 2: Product Selection
  products?: {
    row_number: number
    slot_number: number
    product_type_id: string
    company_product_id: string
  }[]
  
  // Step 3: Commission Settings
  default_commission_rate?: number
  apply_to_all_products?: boolean
  
  // Step 4: Host Location
  host_business_name?: string
  machine_placement_area?: string
  host_address?: string
  host_latitude?: number
  host_longitude?: number
  point_of_contact_name?: string
  point_of_contact_position?: string
  point_of_contact_email?: string
  point_of_contact_phone?: string
} 

// Operator Preview Card
export interface OperatorPreviewCard {
  id: string
  company_id: string
  display_name: string
  description: string
  location_name: string
  logo_url?: string
  machine_count: number
  member_since: string
  created_at: string
  updated_at: string
  company?: {
    id: string
    name: string
    logo_url?: string
  }
} 

// Nayax API Token
export interface NayaxApiToken {
  id: string
  company_id: string
  lynx_api_token: string
  created_at: string
  updated_at: string
} 

// Commission Types
export interface CommissionEarning {
  id: string
  customer_id: string
  operator_company_id: string
  customer_machine_id: string
  transaction_id: string
  transaction_date: string
  
  // Commission Details
  commission_type: 'owner' | 'referral'
  base_amount: number
  commission_percentage: number
  commission_amount: number
  
  // Product Details
  product_name: string
  quantity: number
  
  // Status
  status: 'earned' | 'pending_cashout' | 'paid'
  cashout_id?: string
  
  // Metadata
  created_at: string
  updated_at: string
  
  // Joined data
  operator_company?: {
    id: string
    name: string
    logo_url?: string
  }
  customer_machine?: {
    id: string
    machine_name: string
    host_business_name: string
  }
}

export interface CommissionCashout {
  id: string
  customer_id: string
  
  // Cashout Details
  total_amount: number
  requested_amount: number
  minimum_cashout_amount: number
  
  // Status
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  
  // Payment Details
  payment_method?: string
  payment_reference?: string
  paid_at?: string
  paid_by?: string
  
  // Notes
  customer_notes?: string
  operator_notes?: string
  
  // Metadata
  created_at: string
  updated_at: string
  
  // Joined data
  customer?: {
    id: string
    business_name: string
  }
  paid_by_user?: {
    id: string
    email: string
  }
}

export interface CommissionPayout {
  id: string
  cashout_id: string
  customer_id: string
  operator_company_id: string
  
  // Payment Details
  payment_amount: number
  payment_method: string
  payment_reference?: string
  payment_date: string
  
  // Status
  status: 'pending' | 'completed' | 'failed'
  
  // Metadata
  created_at: string
  updated_at: string
  
  // Joined data
  operator_company?: {
    id: string
    name: string
  }
  customer?: {
    id: string
    email: string
  }
}

export interface CommissionSummary {
  total_earnings: number
  total_earned: number
  pending_cashouts: number
  total_pending: number
  total_paid: number
  available_balance: number
  available_for_cashout: number
  minimum_cashout_amount: number
  recent_activity: CommissionEarning[]
  operator_breakdown: {
    operator_id: string
    operator_name: string
    operator_company_id: string
    total_earnings: number
    pending_amount: number
  }[]
} 