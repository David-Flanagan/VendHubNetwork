import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { machineId, startDate, endDate, customerId } = await request.json()

    console.log('Syncing Nayax data for machine:', machineId)
    console.log('Date range:', startDate, 'to', endDate)

    // Step 1: Get the operator's Nayax token
    const { data: customerMachine } = await supabase
      .from('customer_machines')
      .select('company_id, nayax_machine_id')
      .eq('id', machineId)
      .single()

    if (!customerMachine) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
    }

    const { data: company } = await supabase
      .from('companies')
      .select('nayax_api_token')
      .eq('id', customerMachine.company_id)
      .single()

    if (!company?.nayax_api_token) {
      return NextResponse.json({ error: 'No Nayax API token found' }, { status: 404 })
    }

    // Step 2: Fetch data from Nayax API
    const nayaxResponse = await fetch(
      `https://lynx.nayax.com/operational/v1/machines/${customerMachine.nayax_machine_id}/lastSales?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: {
          'Authorization': `Bearer ${company.nayax_api_token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!nayaxResponse.ok) {
      throw new Error(`Nayax API error: ${nayaxResponse.status}`)
    }

    const nayaxData = await nayaxResponse.json()
    console.log(`Fetched ${nayaxData.length} transactions from Nayax`)

    // Step 3: Process and store transactions
    const processedTransactions = []
    
    for (const transaction of nayaxData) {
      // Extract MDB code from ProductName (e.g., "Sport SPF 30(2 = 0.15)" -> "2")
      const mdbMatch = transaction.ProductName?.match(/\((\d+)\s*=/)
      const mdbCode = mdbMatch ? mdbMatch[1] : null

      // Determine transaction status
      const transactionStatus = parseFloat(transaction.SettlementValue || 0) > 0 ? 'completed' : 'failed'

      // Parse timestamps
      const authorizationDatetime = transaction.AuthorizationDateTimeGMT ? new Date(transaction.AuthorizationDateTimeGMT) : null
      const settlementDatetime = transaction.SettlementDateTimeGMT ? new Date(transaction.SettlementDateTimeGMT) : null
      const machineAuthorizationTime = transaction.MachineAuthorizationTime ? new Date(transaction.MachineAuthorizationTime) : null

      const processedTransaction = {
        transaction_id: transaction.TransactionID,
        machine_id: transaction.MachineID,
        customer_machine_id: machineId,
        company_id: customerMachine.company_id,
        
        // Structured fields
        product_name: transaction.ProductName,
        mdb_code: mdbCode,
        authorization_value: transaction.AuthorizationValue,
        settlement_value: transaction.SettlementValue,
        currency_code: transaction.CurrencyCode,
        payment_method: transaction.PaymentMethod,
        card_brand: transaction.CardBrand,
        payment_service_provider: transaction.PaymentServiceProviderName,
        transaction_status: transactionStatus,
        multivend_transaction: transaction.MultivendTransactionBit,
        multivend_products_count: transaction.MultivendNumverOfProducts,
        quantity: 1, // Hardcoded for single-item transactions
        
        // Timestamps
        authorization_datetime: authorizationDatetime,
        settlement_datetime: settlementDatetime,
        machine_authorization_time: machineAuthorizationTime,
        
        // Metadata
        site_id: transaction.SiteID,
        site_name: transaction.SiteName,
        machine_name: transaction.MachineName,
        machine_number: transaction.MachineNumber,
        
        // Raw data backup
        raw_data: transaction,
        
        // Sync metadata
        sync_date: new Date()
      }

      // Upsert transaction (insert or update if exists)
      const { data: storedTransaction, error: upsertError } = await supabase
        .from('nayax_transactions')
        .upsert(processedTransaction, { 
          onConflict: 'transaction_id',
          ignoreDuplicates: false 
        })
        .select()
        .single()

      if (upsertError) {
        console.error('Error upserting transaction:', upsertError)
        continue
      }

      processedTransactions.push(storedTransaction)
    }

    console.log(`Successfully synced ${processedTransactions.length} transactions`)

    // Step 4: Return processed transactions for display
    return NextResponse.json({
      success: true,
      syncedCount: processedTransactions.length,
      transactions: processedTransactions
    })

  } catch (error) {
    console.error('Error syncing Nayax data:', error)
    return NextResponse.json(
      { error: 'Failed to sync Nayax data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 