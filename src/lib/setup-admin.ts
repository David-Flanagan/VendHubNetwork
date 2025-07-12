import { supabase } from './supabase'

export async function setupAdminUser(email: string, password: string) {
  try {
    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      throw new Error(`Auth error: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('No user created')
    }

    // Insert the user into our users table with admin role
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        role: 'admin'
      })

    if (userError) {
      throw new Error(`User table error: ${userError.message}`)
    }

    console.log('Admin user created successfully!')
    console.log('User ID:', authData.user.id)
    console.log('Email:', email)
    console.log('Role: admin')

    return authData.user
  } catch (error) {
    console.error('Error setting up admin user:', error)
    throw error
  }
}

// Example usage (uncomment to run):
// setupAdminUser('admin@vendhub.com', 'your-secure-password') 