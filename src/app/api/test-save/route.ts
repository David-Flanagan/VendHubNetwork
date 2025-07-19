import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

export async function POST(request: NextRequest) {
  try {
    console.log('Test save endpoint called')
    
    if (!supabase) {
      console.error('Supabase not configured')
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    // Get the auth token from the request
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No authorization header')
      return NextResponse.json(
        { error: 'No authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Token received, length:', token.length)
    
    // Get user from token
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !authUser) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Invalid token', details: authError },
        { status: 401 }
      )
    }

    console.log('User authenticated:', authUser.email)

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (userError || !userData) {
      console.error('User data error:', userError)
      return NextResponse.json(
        { error: 'User not found', details: userError },
        { status: 404 }
      )
    }

    console.log('User data loaded, company_id:', userData.company_id)

    // Test a simple insert
    const testData = {
      company_id: userData.company_id,
      display_name: 'TEST',
      description: 'TEST',
      location_name: 'TEST',
      logo_url: '',
      member_since: new Date().toISOString()
    }

    console.log('Attempting to insert test data:', testData)

    const { data: insertData, error: insertError } = await supabase
      .from('operator_preview_cards')
      .insert([testData])
      .select()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to insert test data', details: insertError },
        { status: 500 }
      )
    }

    console.log('Insert successful:', insertData)

    // Clean up test data
    if (insertData && insertData.length > 0) {
      await supabase
        .from('operator_preview_cards')
        .delete()
        .eq('id', insertData[0].id)
      console.log('Test data cleaned up')
    }

    return NextResponse.json({
      success: true,
      message: 'Test save successful',
      data: insertData[0]
    })

  } catch (error: any) {
    console.error('Test save error:', error)
    console.error('Error type:', typeof error)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
} 