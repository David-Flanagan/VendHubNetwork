import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, startDate, endDate, machineId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log(`Fetching referral sales data for user ${userId}`)
    console.log(`Date range: ${startDate} to ${endDate}`)
    console.log(`Machine filter: ${machineId || 'all'}`)

    // Get machines where this user is the referrer
    let machinesQuery = supabase
      .from('customer_machines')
      .select(`
        id,
        host_business_name,
        machine_placement_area,
        slot_configuration,
        nayax_machine_id,
        referral_commission_percent,
        companies(name, logo_url)
      `)
      .eq('referral_user_id', userId)
      .eq('approval_status', 'approved')

    if (machineId && machineId !== 'all') {
      machinesQuery = machinesQuery.eq('id', machineId)
    }

    const { data: machines, error: machinesError } = await machinesQuery

    if (machinesError) {
      console.error('Error fetching machines:', machinesError)
      return NextResponse.json({ error: 'Failed to fetch machines' }, { status: 500 })
    }

    if (!machines || machines.length === 0) {
      return NextResponse.json({ transactions: [], machines: [] })
    }

    const machineIds = machines.map(m => m.id)

    // Build transactions query
    let transactionsQuery = supabase
      .from('nayax_transactions')
      .select('*')
      .in('customer_machine_id', machineIds)
      .gte('authorization_datetime', startDate)
      .lte('authorization_datetime', endDate)
      .not('transaction_status', 'eq', 'Failed')
      .not('transaction_status', 'eq', 'failed') // Exclude failed transactions
      .order('authorization_datetime', { ascending: false })

    const { data: transactions, error: transactionsError } = await transactionsQuery

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    console.log(`Found ${transactions?.length || 0} referral transactions for user ${userId}`)

    // Process transactions with mapping functions
    const processedTransactions = (transactions || []).map(transaction => {
      // Find the corresponding machine
      const machine = machines.find(m => m.id === transaction.customer_machine_id)
      
      // Extract MDB code from product name
      const extractMdbCode = (nayaxProductName: string): string | null => {
        if (!nayaxProductName) return null
        const match = nayaxProductName.match(/\((\d+)\s*=\s*\d+\.\d+\)/)
        return match ? match[1] : null
      }

      // Get product name from slot configuration
      const getProductName = (transaction: any, machine: any): string => {
        const nayaxProductName = transaction.product_name
        if (!nayaxProductName || !machine?.slot_configuration) {
          return nayaxProductName?.replace(/\(\d+\s*=\s*\d+\.\d+\)\s*\n?/g, '').trim() || 'Unknown Product'
        }

        const mdbCode = extractMdbCode(nayaxProductName)
        if (!mdbCode) {
          return nayaxProductName.replace(/\(\d+\s*=\s*\d+\.\d+\)\s*\n?/g, '').trim() || 'Unknown Product'
        }

        try {
          const slotConfig = typeof machine.slot_configuration === 'string' 
            ? JSON.parse(machine.slot_configuration) 
            : machine.slot_configuration

          let slots = []
          if (slotConfig.rows && slotConfig.rows[0] && slotConfig.rows[0].slots) {
            slots = slotConfig.rows[0].slots
          } else if (slotConfig.slots) {
            slots = slotConfig.slots
          }

          for (const slot of slots) {
            if (slot.mdb_code === mdbCode || slot.mdb_code === parseInt(mdbCode)) {
              return slot.product_name || 'Unknown Product'
            }
          }

          return nayaxProductName.replace(/\(\d+\s*=\s*\d+\.\d+\)\s*\n?/g, '').trim() || 'Unknown Product'
        } catch (error) {
          return nayaxProductName.replace(/\(\d+\s*=\s*\d+\.\d+\)\s*\n?/g, '').trim() || 'Unknown Product'
        }
      }

      // Get base price from slot configuration
      const getBasePrice = (transaction: any, machine: any): number => {
        const nayaxProductName = transaction.product_name
        if (!nayaxProductName || !machine?.slot_configuration) return 0

        const mdbCode = extractMdbCode(nayaxProductName)
        if (!mdbCode) return 0

        try {
          const slotConfig = typeof machine.slot_configuration === 'string' 
            ? JSON.parse(machine.slot_configuration) 
            : machine.slot_configuration

          let slots = []
          if (slotConfig.rows && slotConfig.rows[0] && slotConfig.rows[0].slots) {
            slots = slotConfig.rows[0].slots
          } else if (slotConfig.slots) {
            slots = slotConfig.slots
          }

          for (const slot of slots) {
            if (slot.mdb_code === mdbCode || slot.mdb_code === parseInt(mdbCode)) {
              return parseFloat(slot.base_price || 0)
            }
          }

          return 0
        } catch (error) {
          return 0
        }
      }

      // Calculate referral commission (only for completed transactions)
      const basePrice = getBasePrice(transaction, machine)
      const commissionPercent = machine?.referral_commission_percent || 0
      const isCompleted = transaction.settlement_value > 0
      const commissionAmount = isCompleted ? Math.round((basePrice * commissionPercent / 100) * 100) / 100 : 0

      return {
        ...transaction,
        // Add mapped data
        mappedMachine: machine ? {
          id: machine.id,
          displayName: `${machine.host_business_name} - ${machine.machine_placement_area}`,
          businessName: machine.host_business_name,
          placementArea: machine.machine_placement_area,
          companyName: (machine.companies as any)?.name
        } : null,
        mappedProductName: getProductName(transaction, machine),
        // Referral-specific fields
        operating_company: (machine?.companies as any)?.name || 'Unknown Company',
        base_price: basePrice,
        commission_percent: commissionPercent,
        commission_amount: commissionAmount,
        machine_name: machine ? `${machine.host_business_name} - ${machine.machine_placement_area}` : 'Unknown Machine',
        // Format amounts
        formattedAuthorizationValue: `$${parseFloat(transaction.authorization_value || 0).toFixed(2)}`,
        formattedSettlementValue: `$${parseFloat(transaction.settlement_value || 0).toFixed(2)}`,
        // Add quantity (hardcoded to 1 for now)
        quantity: 1,
        // Format time
        time: new Date(transaction.authorization_datetime).toLocaleString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        transaction_status: transaction.settlement_value > 0 ? 'Completed' : 'Failed'
      }
    })

    return NextResponse.json({ 
      transactions: processedTransactions,
      machines: machines.map(m => ({
        id: m.id,
        displayName: `${m.host_business_name} - ${m.machine_placement_area}`,
        companyName: (m.companies as any)?.name
      }))
    })

  } catch (error) {
    console.error('Error in referral sales API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 