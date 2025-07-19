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

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found', details: userError },
        { status: 404 }
      )
    }

    // Get company data
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', userData.company_id)
      .single()

    // Get existing preview card data
    const { data: previewCardData, error: previewError } = await supabase
      .from('operator_preview_cards')
      .select('*')
      .eq('company_id', userData.company_id)
      .single()

    // Get all preview cards for this company (in case there are multiple)
    const { data: allPreviewCards, error: allPreviewError } = await supabase
      .from('operator_preview_cards')
      .select('*')
      .eq('company_id', userData.company_id)

    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        company_id: userData.company_id
      },
      company: companyData,
      existingPreviewCard: previewCardData,
      allPreviewCards: allPreviewCards,
      errors: {
        companyError: companyError?.message,
        previewError: previewError?.message,
        allPreviewError: allPreviewError?.message
      }
    })

  } catch (error) {
    console.error('Debug preview card error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
} 