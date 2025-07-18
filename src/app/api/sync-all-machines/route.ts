import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('Starting background sync for all machines...')
    
    // Get all machines with Nayax IDs
    const { data: machines, error: machinesError } = await supabase
      .from('customer_machines')
      .select(`
        id,
        nayax_machine_id,
        company_id
      `)
      .not('nayax_machine_id', 'is', null)
      .eq('approval_status', 'approved')

    if (machinesError) {
      console.error('Error fetching machines:', machinesError)
      return NextResponse.json({ error: 'Failed to fetch machines' }, { status: 500 })
    }

    if (!machines || machines.length === 0) {
      console.log('No machines with Nayax IDs found')
      return NextResponse.json({ message: 'No machines to sync', syncedCount: 0 })
    }

    console.log(`Found ${machines.length} machines to sync`)

    let totalTransactions = 0
    const syncResults = []

    // Process each machine
    for (const machine of machines) {
      try {
        // Get the Nayax API token for this company
        const { data: tokenData, error: tokenError } = await supabase
          .from('nayax_api_tokens')
          .select('lynx_api_token')
          .eq('company_id', machine.company_id)
          .single()

        if (tokenError || !tokenData?.lynx_api_token) {
          console.log(`No Nayax token for machine ${machine.id} (company ${machine.company_id})`)
          continue
        }

        console.log(`Syncing machine ${machine.nayax_machine_id}...`)

        // Get date range (last 7 days by default)
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 7)

        const startDateStr = startDate.toISOString().split('T')[0]
        const endDateStr = endDate.toISOString().split('T')[0]

        // Fetch Nayax data
        const nayaxResponse = await fetch(
          `https://lynx.nayax.com/operational/v1/machines/${machine.nayax_machine_id}/lastSales?startDate=${startDateStr}&endDate=${endDateStr}`,
          {
            headers: {
              'Authorization': `Bearer ${tokenData.lynx_api_token}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (!nayaxResponse.ok) {
          console.error(`Nayax API error for machine ${machine.nayax_machine_id}:`, nayaxResponse.status)
          continue
        }

        const nayaxData = await nayaxResponse.json()
        
        if (!Array.isArray(nayaxData)) {
          console.log(`No transactions for machine ${machine.nayax_machine_id}`)
          continue
        }

        console.log(`Found ${nayaxData.length} transactions for machine ${machine.nayax_machine_id}`)

        // Process and store transactions
        const transactionsToInsert = nayaxData.map((transaction: any) => ({
          customer_machine_id: machine.id,
          transaction_id: transaction.TransactionID,
          raw_data: transaction,
          authorization_datetime: transaction.AuthorizationDateTimeGMT,
          settlement_datetime: transaction.SettlementDateTimeGMT,
          authorization_value: transaction.AuthorizationValue,
          settlement_value: transaction.SettlementValue,
          payment_method: transaction.PaymentMethod,
          product_name: transaction.ProductName,
          machine_id: transaction.MachineID,
          transaction_status: transaction.SettlementValue > 0 ? 'completed' : 'failed'
        }))

        // Insert transactions (with conflict resolution)
        const { data: insertedTransactions, error: insertError } = await supabase
          .from('nayax_transactions')
          .upsert(transactionsToInsert, {
            onConflict: 'transaction_id',
            ignoreDuplicates: true
          })

        if (insertError) {
          console.error(`Error inserting transactions for machine ${machine.nayax_machine_id}:`, insertError)
          continue
        }

        totalTransactions += transactionsToInsert.length
        syncResults.push({
          machineId: machine.nayax_machine_id,
          transactionsCount: transactionsToInsert.length,
          success: true
        })

        console.log(`Successfully synced ${transactionsToInsert.length} transactions for machine ${machine.nayax_machine_id}`)

      } catch (error) {
        console.error(`Error syncing machine ${machine.nayax_machine_id}:`, error)
        syncResults.push({
          machineId: machine.nayax_machine_id,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        })
      }
    }

    console.log(`Background sync completed. Total transactions: ${totalTransactions}`)

    return NextResponse.json({
      message: 'Background sync completed',
      totalMachines: machines.length,
      totalTransactions,
      syncResults
    })

  } catch (error) {
    console.error('Background sync error:', error)
    return NextResponse.json(
      { error: 'Background sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 