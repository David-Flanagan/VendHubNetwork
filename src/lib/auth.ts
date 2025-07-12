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

export async function signOut() {
  await supabase.auth.signOut()
} 