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

    // Test reading from operator_preview_cards table
    const { data: readData, error: readError } = await supabase
      .from('operator_preview_cards')
      .select('*')
      .eq('company_id', userData.company_id)
      .limit(1)

    // Test inserting into operator_preview_cards table
    const testData = {
      company_id: userData.company_id,
      display_name: 'Test Preview Card',
      description: 'Test description',
      location_name: 'Test Location',
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
        role: userData.role,
        company_id: userData.company_id
      },
      readTest: {
        success: !readError,
        error: readError,
        data: readData
      },
      insertTest: {
        success: !insertError,
        error: insertError,
        data: insertData
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