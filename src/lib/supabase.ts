import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jljchibgaoiredkuwncn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsamNoaWJnYW9pcmVka3V3bmNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzA3MzAsImV4cCI6MjA2NzkwNjczMH0.wCJ2jX7Wb8T4oW0JmIPdbRWdZ77Go99pGE5_2rIbjrc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 