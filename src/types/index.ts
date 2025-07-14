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
  
  // For polygon method
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