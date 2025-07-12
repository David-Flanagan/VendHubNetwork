import { supabase } from './supabase'

export interface User {
  id: string
  email: string
  role: string
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
    
    console.log('Auth user:', authUser?.id, authUser?.email)
    
    if (!authUser) {
      console.log('No auth user found')
      return null
    }

    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    console.log('User data from DB:', userData, 'Error:', error)

    if (error) {
      console.error('Error fetching user from DB:', error)
      return null
    }

    if (!userData) {
      console.log('No user data found in DB for auth user')
      return null
    }

    console.log('Returning user with role:', userData.role)
    return userData
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function signOut() {
  await supabase.auth.signOut()
}

// Listen for auth state changes
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      const user = await getCurrentUser()
      callback(user)
    } else if (event === 'SIGNED_OUT') {
      callback(null)
    }
  })
} 