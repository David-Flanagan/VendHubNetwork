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

    // Get user data to verify they're an operator
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

    if (userData.role !== 'operator') {
      return NextResponse.json(
        { error: 'Only operators can access preview cards' },
        { status: 403 }
      )
    }

    if (!userData.company_id) {
      return NextResponse.json(
        { error: 'No company associated with user' },
        { status: 400 }
      )
    }

    // Get the preview card data
    const { data: previewCard, error: previewError } = await supabase
      .from('operator_preview_cards')
      .select('*')
      .eq('company_id', userData.company_id)
      .single()

    if (previewError && previewError.code !== 'PGRST116') {
      console.error('Error loading preview card:', previewError)
      return NextResponse.json(
        { error: 'Failed to load preview card', details: previewError },
        { status: 500 }
      )
    }

    // Get company data for defaults
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', userData.company_id)
      .single()

    if (companyError) {
      console.error('Error loading company data:', companyError)
    }

    return NextResponse.json({
      success: true,
      data: previewCard,
      company: companyData
    })

  } catch (error) {
    console.error('Load preview card error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
} 