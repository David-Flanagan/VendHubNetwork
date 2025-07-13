import { supabase } from './supabase'

export interface User {
  id: string
  email: string
  role: string
  company_id?: string
}

export async function checkAdminAccess(): Promise<User | null> {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    console.log('Checking admin access for:', authUser?.email)
    
    if (!authUser) {
      console.log('No auth user for admin check')
      return null
    }

    // Check if user has admin role
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    console.log('Admin check - User data:', userData, 'Error:', error)

    if (error) {
      console.error('Error checking admin access:', error)
      return null
    }

    if (!userData) {
      console.log('No user data found for admin check')
      return null
    }

    if (userData.role !== 'admin') {
      console.log('User role is not admin:', userData.role)
      return null
    }

    console.log('Admin access granted for:', userData.email)
    return userData
  } catch (error) {
    console.error('Error checking admin access:', error)
    return null
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      return null
    }

    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (error) {
      console.error('Error fetching user from DB:', error)
      return null
    }

    if (!userData) {
      return null
    }

    return userData
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function signOut() {
  await supabase.auth.signOut()
}

// Test function to check if Supabase is working
export async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...')
    const { data, error } = await supabase.from('users').select('count').limit(1)
    console.log('Supabase test result:', data, error)
    return { success: !error, error }
  } catch (error) {
    console.error('Supabase connection test failed:', error)
    return { success: false, error }
  }
}

// Listen for auth state changes
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
      const user = await getCurrentUser()
      callback(user)
    } else if (event === 'SIGNED_OUT') {
      callback(null)
    }
  })
} 