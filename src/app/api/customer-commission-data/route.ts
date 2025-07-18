import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CommissionEarning, CommissionCashout, CommissionPayout, CommissionSummary } from '@/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { customerId, tab = 'earnings', dateRange = 'today', operatorFilter = 'all' } = await request.json()

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }

    console.log(`Fetching commission data for customer ${customerId}`)
    console.log(`Tab: ${tab}, Date range: ${dateRange}, Operator filter: ${operatorFilter}`)

    // Calculate date range
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        break
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        break
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        endDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear() + 1, 0, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    }

    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`)

    let response: any = {}

    switch (tab) {
      case 'earnings':
        response = await fetchCommissionEarnings(supabase, customerId, startDate, endDate, operatorFilter)
        break
      case 'cashouts':
        response = await fetchCommissionCashouts(supabase, customerId, startDate, endDate, operatorFilter)
        break
      case 'payouts':
        response = await fetchCommissionPayouts(supabase, customerId, startDate, endDate, operatorFilter)
        break
      case 'summary':
        response = await fetchCommissionSummary(supabase, customerId)
        break
      default:
        response = await fetchCommissionEarnings(supabase, customerId, startDate, endDate, operatorFilter)
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching commission data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function fetchCommissionEarnings(
  supabase: any, 
  customerId: string, 
  startDate: Date, 
  endDate: Date, 
  operatorFilter: string
) {
  // Check if commission_earnings table exists
  const { data: tableCheck, error: tableCheckError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_name', 'commission_earnings')
    .limit(1)

  if (tableCheckError || !tableCheck || tableCheck.length === 0) {
    console.log('Commission earnings table does not exist, returning empty data')
    return {
      earnings: [],
      total_earnings: 0
    }
  }

  let query = supabase
    .from('commission_earnings')
    .select(`
      *,
      operator_company:companies!commission_earnings_operator_company_id_fkey (
        id,
        name,
        logo_url
      ),
      customer_machine:customer_machines!commission_earnings_customer_machine_id_fkey (
        id,
        host_business_name,
        machine_placement_area
      )
    `)
    .eq('customer_id', customerId)
    .gte('transaction_date', startDate.toISOString())
    .lt('transaction_date', endDate.toISOString())
    .order('transaction_date', { ascending: false })

  if (operatorFilter !== 'all') {
    query = query.eq('operator_company_id', operatorFilter)
  }

  const { data: earnings, error } = await query

  if (error) {
    console.error('Error fetching commission earnings:', error)
    return {
      earnings: [],
      total_earnings: 0
    }
  }

  console.log(`Found ${earnings?.length || 0} commission earnings for customer ${customerId}`)

  return {
    earnings: earnings || [],
    total_earnings: earnings?.reduce((sum: number, earning: CommissionEarning) => sum + earning.commission_amount, 0) || 0
  }
}

async function fetchCommissionCashouts(
  supabase: any, 
  customerId: string, 
  startDate: Date, 
  endDate: Date, 
  operatorFilter: string
) {
  let query = supabase
    .from('commission_cashouts')
    .select(`
      *,
      customer:users!commission_cashouts_customer_id_fkey (
        id,
        email
      ),
      paid_by_user:users!commission_cashouts_paid_by_fkey (
        id,
        email
      )
    `)
    .eq('customer_id', customerId)
    .gte('created_at', startDate.toISOString())
    .lt('created_at', endDate.toISOString())
    .order('created_at', { ascending: false })

  const { data: cashouts, error } = await query

  if (error) {
    console.error('Error fetching commission cashouts:', error)
    throw error
  }

  console.log(`Found ${cashouts?.length || 0} commission cashouts for customer ${customerId}`)

  return {
    cashouts: cashouts || [],
    total_requested: cashouts?.reduce((sum: number, cashout: CommissionCashout) => sum + cashout.requested_amount, 0) || 0
  }
}

async function fetchCommissionPayouts(
  supabase: any, 
  customerId: string, 
  startDate: Date, 
  endDate: Date, 
  operatorFilter: string
) {
  let query = supabase
    .from('commission_payouts')
    .select(`
      *,
      operator_company:companies!commission_payouts_operator_company_id_fkey (
        id,
        name
      ),
      customer:users!commission_payouts_customer_id_fkey (
        id,
        email
      )
    `)
    .eq('customer_id', customerId)
    .gte('payment_date', startDate.toISOString())
    .lt('payment_date', endDate.toISOString())
    .order('payment_date', { ascending: false })

  if (operatorFilter !== 'all') {
    query = query.eq('operator_company_id', operatorFilter)
  }

  const { data: payouts, error } = await query

  if (error) {
    console.error('Error fetching commission payouts:', error)
    throw error
  }

  console.log(`Found ${payouts?.length || 0} commission payouts for customer ${customerId}`)

  return {
    payouts: payouts || [],
    total_paid: payouts?.reduce((sum: number, payout: CommissionPayout) => sum + payout.payment_amount, 0) || 0
  }
}

async function fetchCommissionSummary(supabase: any, customerId: string): Promise<CommissionSummary> {
  // Check if commission tables exist
  const { data: tableCheck, error: tableCheckError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_name', 'commission_earnings')
    .limit(1)

  if (tableCheckError || !tableCheck || tableCheck.length === 0) {
    console.log('Commission tables do not exist, returning empty summary')
    return {
      total_earnings: 0,
      total_earned: 0,
      pending_cashouts: 0,
      total_pending: 0,
      total_paid: 0,
      available_balance: 0,
      available_for_cashout: 0,
      minimum_cashout_amount: 50,
      recent_activity: [],
      operator_breakdown: []
    }
  }

  // Get total earnings
  const { data: earnings, error: earningsError } = await supabase
    .from('commission_earnings')
    .select('commission_amount')
    .eq('customer_id', customerId)

  if (earningsError) {
    console.error('Error fetching total earnings:', earningsError)
    // Return empty data instead of throwing
    return {
      total_earnings: 0,
      total_earned: 0,
      pending_cashouts: 0,
      total_pending: 0,
      total_paid: 0,
      available_balance: 0,
      available_for_cashout: 0,
      minimum_cashout_amount: 50,
      recent_activity: [],
      operator_breakdown: []
    }
  }

  const totalEarnings = earnings?.reduce((sum: number, earning: any) => sum + earning.commission_amount, 0) || 0

  // Get pending cashouts
  const { data: pendingCashouts, error: cashoutsError } = await supabase
    .from('commission_cashouts')
    .select('requested_amount')
    .eq('customer_id', customerId)
    .eq('status', 'pending')

  if (cashoutsError) {
    console.error('Error fetching pending cashouts:', cashoutsError)
    // Continue with 0 pending amount
  }

  const pendingAmount = pendingCashouts?.reduce((sum: number, cashout: any) => sum + cashout.requested_amount, 0) || 0

  // Get total paid
  const { data: payouts, error: payoutsError } = await supabase
    .from('commission_payouts')
    .select('payment_amount')
    .eq('customer_id', customerId)

  if (payoutsError) {
    console.error('Error fetching total payouts:', payoutsError)
    // Continue with 0 total paid
  }

  const totalPaid = payouts?.reduce((sum: number, payout: any) => sum + payout.payment_amount, 0) || 0

  // Get recent activity (last 5 transactions)
  const { data: recentActivity, error: activityError } = await supabase
    .from('commission_earnings')
    .select(`
      *,
      operator_company:companies!commission_earnings_operator_company_id_fkey (
        id,
        name
      )
    `)
    .eq('customer_id', customerId)
    .order('transaction_date', { ascending: false })
    .limit(5)

  if (activityError) {
    console.error('Error fetching recent activity:', activityError)
    throw activityError
  }

  // Get operator breakdown
  const { data: operatorBreakdown, error: breakdownError } = await supabase
    .from('commission_earnings')
    .select(`
      operator_company_id,
      operator_company:companies!commission_earnings_operator_company_id_fkey (
        id,
        name
      )
    `)
    .eq('customer_id', customerId)

  if (breakdownError) {
    console.error('Error fetching operator breakdown:', breakdownError)
    throw breakdownError
  }

  // Group by operator
  const operatorTotals = operatorBreakdown?.reduce((acc: any, earning: any) => {
    const operatorId = earning.operator_company_id
    const operatorName = earning.operator_company?.name || 'Unknown'
    
    if (!acc[operatorId]) {
      acc[operatorId] = {
        operator_id: operatorId,
        operator_name: operatorName,
        operator_company_id: operatorId,
        total_earnings: 0,
        pending_amount: 0
      }
    }
    
    acc[operatorId].total_earnings += earning.commission_amount || 0
    return acc
  }, {}) || {}

  return {
    total_earnings: totalEarnings,
    total_earned: totalEarnings,
    pending_cashouts: pendingAmount,
    total_pending: pendingAmount,
    total_paid: totalPaid,
    available_balance: totalEarnings - totalPaid - pendingAmount,
    available_for_cashout: totalEarnings - totalPaid - pendingAmount,
    minimum_cashout_amount: 50, // Default minimum cashout amount
    recent_activity: recentActivity || [],
    operator_breakdown: Object.values(operatorTotals)
  }
} 