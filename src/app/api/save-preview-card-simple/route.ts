import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

export async function POST(request: NextRequest) {
  console.log('=== SIMPLE SAVE PREVIEW CARD ENDPOINT CALLED ===')
  
  try {
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

    // Get the preview card data from request body
    const { previewCardData, isUpdate } = await request.json()

    console.log('Raw preview card data received:', previewCardData)
    console.log('isUpdate flag:', isUpdate)

    // Validate and truncate the data
    const validatedData = {
      company_id: userData.company_id,
      display_name: (previewCardData.display_name || '').substring(0, 50),
      description: (previewCardData.description || '').substring(0, 200),
      location_name: (previewCardData.location_name || '').substring(0, 100),
      logo_url: (previewCardData.logo_url || '').substring(0, 500),
      member_since: previewCardData.member_since || new Date().toISOString()
    }

    console.log('Validated data being saved:', validatedData)

    let result
    if (isUpdate) {
      console.log('Performing UPDATE operation')
      // Update existing
      result = await supabase
        .from('operator_preview_cards')
        .update(validatedData)
        .eq('company_id', userData.company_id)
        .select()
    } else {
      console.log('Performing INSERT operation')
      // Create new
      result = await supabase
        .from('operator_preview_cards')
        .insert([validatedData])
        .select()
    }

    if (result.error) {
      console.error('Error saving preview card:', result.error)
      return NextResponse.json(
        { error: 'Failed to save preview card', details: result.error },
        { status: 500 }
      )
    }

    console.log('Save successful:', result.data)

    return NextResponse.json({
      success: true,
      data: result.data[0]
    })

  } catch (error: any) {
    console.error('Simple save error:', error)
    console.error('Error type:', typeof error)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
} 