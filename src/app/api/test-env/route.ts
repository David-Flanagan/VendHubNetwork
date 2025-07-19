import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  return NextResponse.json({
    supabaseUrl: supabaseUrl ? 'SET' : 'NOT SET',
    supabaseServiceKey: supabaseServiceKey ? 'SET' : 'NOT SET',
    hasServiceKey: !!supabaseServiceKey
  })
} 