// User Roles
export type UserRole = 'admin' | 'operator' | 'customer'

// User Profile
export interface UserProfile {
  id: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}

// Admin specific types
export interface GlobalProduct {
  id: string
  name: string
  description?: string
  product_type: string
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