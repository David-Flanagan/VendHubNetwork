import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a server-side Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey
  })
}

const supabaseAdmin = createClient(
  supabaseUrl!,
  supabaseServiceKey!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS and get the token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('nayax_api_tokens')
      .select('lynx_api_token')
      .eq('company_id', companyId)
      .single()

    if (tokenError || !tokenData) {
      console.error('Token lookup failed:', { companyId, error: tokenError })
      return NextResponse.json(
        { error: 'No Nayax API token found for this operator' },
        { status: 404 }
      )
    }

    // Return the token (this will be used server-side only)
    return NextResponse.json({ 
      token: tokenData.lynx_api_token,
      tokenMasked: tokenData.lynx_api_token.substring(0, 4) + '-****-****-****'
    })

  } catch (error) {
    console.error('Error in get-operator-token:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 