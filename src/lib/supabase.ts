import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// This console.log is essential for environment variables to load properly
console.log('Supabase config loaded:', {
  url: supabaseUrl ? 'SET' : 'MISSING',
  key: supabaseAnonKey ? 'SET' : 'MISSING'
})

// Only create the client if we have the required environment variables
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null 