import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

export async function POST(request: NextRequest) {
  console.log('=== SAVE PREVIEW CARD ENDPOINT CALLED ===')
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
        { error: 'Only operators can save preview cards' },
        { status: 403 }
      )
    }

    if (!userData.company_id) {
      return NextResponse.json(
        { error: 'No company associated with user' },
        { status: 400 }
      )
    }

    // Get the preview card data from request body
    const { previewCardData, isUpdate } = await request.json()

    console.log('Raw preview card data received:', previewCardData)

    // Validate and truncate the data
    const validatedData = {
      company_id: userData.company_id,
      display_name: (previewCardData.display_name || '').substring(0, 50),
      description: (previewCardData.description || '').substring(0, 200),
      location_name: (previewCardData.location_name || '').substring(0, 100),
      logo_url: (previewCardData.logo_url || '').substring(0, 500), // Limit logo URL length
      member_since: previewCardData.member_since || new Date().toISOString()
    }

    console.log('Validated data being saved:', validatedData)
    console.log('Field lengths:', {
      display_name: validatedData.display_name.length,
      description: validatedData.description.length,
      location_name: validatedData.location_name.length,
      logo_url: validatedData.logo_url.length
    })

    let result
    if (isUpdate) {
      // Update existing
      result = await supabase
        .from('operator_preview_cards')
        .update(validatedData)
        .eq('company_id', userData.company_id)
        .select()
    } else {
      // Create new
      result = await supabase
        .from('operator_preview_cards')
        .insert([validatedData])
        .select()
    }

    if (result.error) {
      console.error('Error saving preview card:', result.error)
      console.error('Error code:', result.error.code)
      console.error('Error message:', result.error.message)
      console.error('Error details:', result.error.details)
      return NextResponse.json(
        { error: 'Failed to save preview card', details: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data[0]
    })

  } catch (error: any) {
    console.error('Save preview card error:', error)
    console.error('Error type:', typeof error)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
} 