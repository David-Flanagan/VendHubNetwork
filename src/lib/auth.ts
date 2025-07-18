import { supabase } from './supabase'

export interface User {
  id: string
  email: string
  role: string
  company_id?: string
}

export async function checkAdminAccess(): Promise<User | null> {
  try {
    if (!supabase) {
      console.error('Supabase not configured')
      return null
    }

    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      return null
    }

    // Check if user has admin role
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (error || !userData || userData.role !== 'admin') {
      return null
    }

    return userData
  } catch (error) {
    console.error('Error checking admin access:', error)
    return null
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    if (!supabase) {
      console.error('Supabase not configured')
      return null
    }

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return null
    }

    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (error || !userData) {
      return null
    }

    return userData
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function signOut() {
  try {
    if (!supabase) {
      console.error('Supabase not configured')
      return
    }
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Error signing out:', error)
  }
}

// Test function to check if Supabase is working
export async function testSupabaseConnection() {
  try {
    if (!supabase) {
      console.error('Supabase not configured')
      return { success: false, error: 'Supabase not configured' }
    }
    const { data, error } = await supabase.from('users').select('count').limit(1)
    return { success: !error, error }
  } catch (error) {
    console.error('Supabase connection test failed:', error)
    return { success: false, error }
  }
}

// Improved auth state change listener that prevents infinite loops
let authStateListener: any = null
let isListening = false

export function onAuthStateChange(callback: (user: User | null) => void) {
  // Prevent multiple listeners
  if (isListening && authStateListener) {
    return authStateListener
  }

  if (!supabase) {
    console.error('Supabase not configured')
    return { data: { subscription: { unsubscribe: () => {} } } }
  }

  isListening = true
  
  authStateListener = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state change:', event, session?.user?.email)
    
    try {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        // Use a simple user object instead of calling getCurrentUser to prevent loops
        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          role: 'unknown', // Will be updated by the component if needed
          company_id: undefined
        }
        callback(user)
      } else if (event === 'SIGNED_OUT') {
        callback(null)
      }
    } catch (error) {
      console.error('Error in auth state change:', error)
      callback(null)
    }
  })

  return authStateListener
}

// Function to get full user data without triggering auth loops
export async function getFullUserData(userId: string): Promise<User | null> {
  try {
    if (!supabase) {
      console.error('Supabase not configured')
      return null
    }

    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !userData) {
      return null
    }

    return userData
  } catch (error) {
    console.error('Error getting full user data:', error)
    return null
  }
} 