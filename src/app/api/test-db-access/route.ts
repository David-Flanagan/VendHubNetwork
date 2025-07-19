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

    // Test 1: Can we read from users table?
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    // Test 2: Can we read from companies table?
    let companyData = null
    let companyError = null
    if (userData?.company_id) {
      const { data: company, error: error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userData.company_id)
        .single()
      companyData = company
      companyError = error
    }

    // Test 3: Can we read from operator_preview_cards table?
    const { data: previewData, error: previewError } = await supabase
      .from('operator_preview_cards')
      .select('*')
      .limit(1)

    // Test 4: Can we insert a test record?
    const testData = {
      company_id: userData?.company_id || '00000000-0000-0000-0000-000000000000',
      display_name: 'TEST',
      description: 'TEST',
      location_name: 'TEST',
      logo_url: '',
      member_since: new Date().toISOString()
    }

    const { data: insertData, error: insertError } = await supabase
      .from('operator_preview_cards')
      .insert([testData])
      .select()

    // Clean up test data
    if (insertData && insertData.length > 0) {
      await supabase
        .from('operator_preview_cards')
        .delete()
        .eq('id', insertData[0].id)
    }

    return NextResponse.json({
      user: {
        id: authUser.id,
        email: authUser.email,
        role: userData?.role,
        company_id: userData?.company_id
      },
      tests: {
        usersTable: {
          success: !userError,
          error: userError,
          data: userData
        },
        companiesTable: {
          success: !companyError,
          error: companyError,
          data: companyData
        },
        previewCardsTable: {
          success: !previewError,
          error: previewError,
          data: previewData
        },
        insertTest: {
          success: !insertError,
          error: insertError,
          data: insertData
        }
      }
    })

  } catch (error) {
    console.error('Test access error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
} 