// User Roles
export type UserRoleType = 'admin' | 'operator' | 'customer'

// User Profile
export interface UserProfile {
  id: string
  email: string
  role: UserRoleType
  created_at: string
  updated_at: string
}

// Admin specific types
export interface GlobalProduct {
  id: string
  brand_name: string
  product_name: string
  description?: string
  product_type_id: string
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
  service_area_radius_miles?: number
  map_enabled?: boolean
  sections_config?: {
    [key: string]: {
      enabled: boolean
      mandatory: boolean
      order: number
    }
  }
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