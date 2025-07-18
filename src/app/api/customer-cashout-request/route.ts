import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { customerId, operatorId, payoutMethodId, amount, payoutMethodName } = await request.json()

    console.log('Cashout request received:', {
      customerId,
      operatorId,
      payoutMethodId,
      amount,
      payoutMethodName
    })

    // Validate required fields
    if (!customerId || !operatorId || !payoutMethodId || !amount || !payoutMethodName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate amount is positive
    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Get the payout method details to validate minimum amount
    const { data: payoutMethod, error: payoutError } = await supabase
      .from('operator_payout_settings')
      .select(`
        *,
        payout_methods (*)
      `)
      .eq('company_id', operatorId)
      .eq('payout_method_id', payoutMethodId)
      .eq('is_enabled', true)
      .single()

    if (payoutError || !payoutMethod) {
      console.error('Error fetching payout method:', payoutError)
      return NextResponse.json(
        { error: 'Invalid payout method' },
        { status: 400 }
      )
    }

    // Check if amount meets minimum requirement
    if (amount < payoutMethod.minimum_amount) {
      return NextResponse.json(
        { error: `Amount must be at least ${payoutMethod.minimum_amount}` },
        { status: 400 }
      )
    }

    // Calculate processing fees
    const processingFeePercentage = (amount * payoutMethod.processing_fee_percentage) / 100
    const processingFeeFixed = payoutMethod.processing_fee_fixed
    const totalProcessingFee = processingFeePercentage + processingFeeFixed
    const netAmount = amount - totalProcessingFee

    // Create the cashout request
    const { data: cashoutRequest, error: insertError } = await supabase
      .from('payout_requests')
      .insert({
        customer_id: customerId,
        company_id: operatorId,
        payout_method_id: payoutMethodId,
        amount: amount,
        processing_fee: totalProcessingFee,
        net_amount: netAmount,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating cashout request:', insertError)
      return NextResponse.json(
        { error: 'Failed to create cashout request' },
        { status: 500 }
      )
    }

    console.log('Cashout request created successfully:', cashoutRequest)

    return NextResponse.json({
      success: true,
      cashoutRequest: {
        id: cashoutRequest.id,
        requestedAmount: cashoutRequest.amount,
        processingFee: cashoutRequest.processing_fee,
        netAmount: cashoutRequest.net_amount,
        status: cashoutRequest.status,
        payoutMethodName: payoutMethodName,
        createdAt: cashoutRequest.created_at
      }
    })

  } catch (error) {
    console.error('Error processing cashout request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 