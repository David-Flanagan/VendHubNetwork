import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    // Get the auth token from the request
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Get user from token
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Invalid token', details: authError },
        { status: 401 }
      )
    }

    // Get user data from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (userError) {
      return NextResponse.json(
        { error: 'Error fetching user data', details: userError },
        { status: 500 }
      )
    }

    // Get company data if user has company_id
    let companyData = null
    if (userData.company_id) {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userData.company_id)
        .single()
      
      if (!companyError) {
        companyData = company
      }
    }

    // Check if preview card exists
    let previewCardData = null
    if (userData.company_id) {
      const { data: previewCard, error: previewError } = await supabase
        .from('operator_preview_cards')
        .select('*')
        .eq('company_id', userData.company_id)
        .single()
      
      if (!previewError) {
        previewCardData = previewCard
      }
    }

    return NextResponse.json({
      authUser: {
        id: authUser.id,
        email: authUser.email
      },
      userData,
      companyData,
      previewCardData,
      hasCompanyId: !!userData.company_id,
      hasCompany: !!companyData,
      hasPreviewCard: !!previewCardData
    })

  } catch (error) {
    console.error('Debug user error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
} 