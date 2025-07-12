import { supabase } from './supabase'

export interface User {
  id: string
  email: string
  role: string
}

export async function checkAdminAccess(): Promise<User | null> {
  try {
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

    if (error || userData?.role !== 'admin') {
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