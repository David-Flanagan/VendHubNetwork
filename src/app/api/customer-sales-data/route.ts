import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { customerId, startDate, endDate, machineId, includeFailed = false } = await request.json()

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }

    console.log(`Fetching sales data for customer ${customerId}`)
    console.log(`Date range: ${startDate} to ${endDate}`)
    console.log(`Machine filter: ${machineId || 'all'}`)
    console.log(`Include failed transactions: ${includeFailed}`)

    // Get customer's machines (only machines they own, not machines they referred)
    let machinesQuery = supabase
      .from('customer_machines')
      .select(`
        id,
        host_business_name,
        machine_placement_area,
        slot_configuration,
        nayax_machine_id,
        companies!inner(name, logo_url)
      `)
      .eq('customer_id', customerId)
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

    // Only exclude failed transactions if includeFailed is false
    if (!includeFailed) {
      transactionsQuery = transactionsQuery
        .not('transaction_status', 'eq', 'Failed')
        .not('transaction_status', 'eq', 'failed')
    }

    transactionsQuery = transactionsQuery.order('authorization_datetime', { ascending: false })

    const { data: transactions, error: transactionsError } = await transactionsQuery

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    console.log(`Found ${transactions?.length || 0} transactions for customer ${customerId}`)

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
        } catch {
          return nayaxProductName.replace(/\(\d+\s*=\s*\d+\.\d+\)\s*\n?/g, '').trim() || 'Unknown Product'
        }
      }

      // Get vending price from slot configuration
      const getVendingPrice = (transaction: any, machine: any): string => {
        const nayaxProductName = transaction.product_name
        if (!nayaxProductName || !machine?.slot_configuration) return 'N/A'

        const mdbCode = extractMdbCode(nayaxProductName)
        if (!mdbCode) return 'N/A'

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
              return `$${parseFloat(slot.final_price || 0).toFixed(2)}`
            }
          }

          return 'N/A'
        } catch {
          return 'N/A'
        }
      }

      // Get commission amount from slot configuration
      const getCommissionAmount = (transaction: any, machine: any): string => {
        const nayaxProductName = transaction.product_name
        if (!nayaxProductName || !machine?.slot_configuration) return 'N/A'

        const mdbCode = extractMdbCode(nayaxProductName)
        if (!mdbCode) return 'N/A'

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
              return `$${parseFloat(slot.commission_amount || 0).toFixed(2)}`
            }
          }

          return 'N/A'
        } catch {
          return 'N/A'
        }
      }

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
        vendingPrice: getVendingPrice(transaction, machine),
        commissionAmount: getCommissionAmount(transaction, machine),
        // Format amounts
        formattedAuthorizationValue: `$${parseFloat(transaction.authorization_value || 0).toFixed(2)}`,
        formattedSettlementValue: `$${parseFloat(transaction.settlement_value || 0).toFixed(2)}`,
        // Add quantity (hardcoded to 1 for now)
        quantity: 1,
        // Add transaction status
        transactionStatus: transaction.transaction_status || (transaction.settlement_value > 0 ? 'completed' : 'failed')
      }
    })

    return NextResponse.json({
      transactions: processedTransactions,
      machines: machines.map(m => ({
        id: m.id,
        displayName: `${m.host_business_name} - ${m.machine_placement_area}`,
        businessName: m.host_business_name,
        placementArea: m.machine_placement_area,
        companyName: (m.companies as any)?.name
      }))
    })

  } catch (error) {
    console.error('Error fetching customer sales data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 