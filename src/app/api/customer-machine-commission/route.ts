import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { customerId, operatorId } = await request.json()
    
    console.log('=== COMMISSION API DEBUG START ===')
    console.log('Request body:', { customerId, operatorId })
    
    if (!customerId) {
      console.log('ERROR: Customer ID is required')
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }

    console.log('Processing commission request for customer:', customerId, 'operatorId:', operatorId)

    // Get customer's machines
    let customerMachinesQuery = supabase
      .from('customer_machines')
      .select(`
        id,
        host_business_name,
        machine_placement_area,
        slot_configuration,
        company_id,
        companies (
          id,
          name
        )
      `)
      .eq('customer_id', customerId)

    // Filter by specific operator if provided
    if (operatorId) {
      console.log('Filtering by operator ID:', operatorId)
      customerMachinesQuery = customerMachinesQuery.eq('company_id', operatorId)
    }

    const { data: customerMachines, error: machinesError } = await customerMachinesQuery

    console.log('Customer machines query result:', { 
      data: customerMachines?.length || 0, 
      error: machinesError 
    })

    if (machinesError) {
      console.error('Error fetching customer machines:', machinesError)
      return NextResponse.json({ error: 'Failed to fetch customer machines' }, { status: 500 })
    }

    console.log('Found customer machines:', customerMachines?.length || 0)
    console.log('Customer machines data:', JSON.stringify(customerMachines, null, 2))

    if (!customerMachines || customerMachines.length === 0) {
      return NextResponse.json({
        machineSalesCommission: 0,
        referralCommission: 0,
        totalCommission: 0,
        totalProductsSold: 0,
        totalTransactions: 0,
        machineCount: 0,
        commissionBreakdown: []
      })
    }

    // Get customer machine IDs for transaction lookup
    const customerMachineIds = customerMachines.map(cm => cm.id).filter(Boolean)
    console.log('Customer machine IDs for transaction lookup:', customerMachineIds)

    // Get transactions for these customer machines
    const { data: transactions, error: transactionsError } = await supabase
      .from('nayax_transactions')
      .select('*')
      .in('customer_machine_id', customerMachineIds)
      .not('transaction_status', 'eq', 'Failed')
      .not('transaction_status', 'eq', 'failed') // Exclude failed transactions (both cases)

    console.log('Transactions query result:', { 
      data: transactions?.length || 0, 
      error: transactionsError 
    })

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    console.log('Found transactions (excluding failed):', transactions?.length || 0)
    console.log('Transactions data:', JSON.stringify(transactions?.slice(0, 2), null, 2)) // Log first 2 transactions

    // Calculate machine sales commission
    let totalMachineCommission = 0
    let totalProductsSold = 0
    let totalTransactions = 0
    const commissionBreakdown: any[] = []

    try {
      for (const customerMachine of customerMachines) {
        const machineTransactions = transactions?.filter(t => t.customer_machine_id === customerMachine.id) || []
        let machineCommission = 0
        let machineProductsSold = 0

        console.log(`Processing machine ${customerMachine.id}: ${customerMachine.host_business_name} - ${customerMachine.machine_placement_area}`)
        console.log(`Found ${machineTransactions.length} transactions for this machine`)
        console.log('Slot configuration:', JSON.stringify(customerMachine.slot_configuration, null, 2))

        for (const transaction of machineTransactions) {
          console.log('Processing transaction:', transaction.product_name)
          
          // Parse product name to extract MDB code and sales amount
          const productMatch = transaction.product_name?.match(/\((\d+)\s*=\s*([\d.]+)\)/)
          if (productMatch) {
            const mdbCode = productMatch[1]
            const salesAmount = parseFloat(productMatch[2])
            
            console.log(`MDB Code: ${mdbCode}, Sales Amount: ${salesAmount}`)
            
            // Find product in slot configuration
            const slotConfig = customerMachine.slot_configuration
            if (slotConfig && slotConfig.rows && Array.isArray(slotConfig.rows)) {
              // Extract slots from the rows structure
              const slots = slotConfig.rows.flatMap((row: any) => row.slots || [])
              const product = slots.find((p: any) => p.mdb_code === mdbCode)
              console.log('Found product in slot config:', product)
              if (product) {
                const basePrice = parseFloat(product.base_price) || 0
                const commissionAmount = parseFloat(product.commission_amount) || 0
                console.log(`Base price: ${basePrice}, Commission amount: ${commissionAmount}`)
                
                // Ensure we have valid numbers
                if (!isNaN(commissionAmount) && !isNaN(salesAmount)) {
                  machineCommission += commissionAmount
                  machineProductsSold += salesAmount
                } else {
                  console.log('Invalid commission amount or sales amount:', { commissionAmount, salesAmount })
                }
              } else {
                console.log('No product found for MDB code:', mdbCode)
              }
            } else {
              console.log('Slot config is not in expected format:', slotConfig)
            }
          } else {
            console.log('Could not parse product name:', transaction.product_name)
          }
          totalTransactions++
        }

        // Ensure we have valid numbers before adding to totals
        if (!isNaN(machineCommission)) {
          totalMachineCommission += machineCommission
        }
        if (!isNaN(machineProductsSold)) {
          totalProductsSold += machineProductsSold
        }

        // Add to breakdown
        commissionBreakdown.push({
          machineId: customerMachine.id,
          machineName: `${customerMachine.host_business_name} - ${customerMachine.machine_placement_area}`,
          companyName: (customerMachine.companies as any)?.name || 'Unknown Company',
          commissionType: 'Machine Sales',
          commission: machineCommission || 0,
          productsSold: machineProductsSold || 0,
          transactions: machineTransactions.length
        })
      }
    } catch (error) {
      console.error('Error in machine commission calculation:', error)
      return NextResponse.json({ error: 'Error calculating machine commission' }, { status: 500 })
    }

    // Calculate referral commission (same logic as before)
    let totalReferralCommission = 0

    // Get customers referred by this customer
    const { data: referrals, error: referralsError } = await supabase
      .from('customer_referrals')
      .select('referred_id')
      .eq('referrer_id', customerId)

    if (referralsError) {
      console.error('Error fetching referrals:', referralsError)
    } else if (referrals && referrals.length > 0) {
      const referredCustomerIds = referrals.map(r => r.referred_id)
      
      // Get machines owned by referred customers
      const { data: referredMachines, error: referredMachinesError } = await supabase
        .from('customer_machines')
        .select(`
          id,
          host_business_name,
          machine_placement_area,
          slot_configuration,
          company_id,
          companies (
            id,
            name
          ),
          customers!inner (
            referral_commission_percent
          )
        `)
        .in('customer_id', referredCustomerIds)

      if (referredMachinesError) {
        console.error('Error fetching referred machines:', referredMachinesError)
      } else if (referredMachines) {
        // Filter by specific operator if provided
        const filteredReferredMachines = operatorId 
          ? referredMachines.filter(rm => rm.company_id === operatorId)
          : referredMachines

        const referredCustomerMachineIds = filteredReferredMachines.map(rm => rm.id).filter(Boolean)
        
        if (referredCustomerMachineIds.length > 0) {
          // Get transactions for referred machines
          const { data: referredTransactions, error: referredTransactionsError } = await supabase
            .from('nayax_transactions')
            .select('*')
            .in('customer_machine_id', referredCustomerMachineIds)
            .not('transaction_status', 'eq', 'Failed')
            .not('transaction_status', 'eq', 'failed') // Exclude failed transactions (both cases)

          if (referredTransactionsError) {
            console.error('Error fetching referred transactions:', referredTransactionsError)
          } else if (referredTransactions) {
            for (const referredMachine of filteredReferredMachines) {
              const machineTransactions = referredTransactions.filter(t => t.customer_machine_id === referredMachine.id)
              let machineReferralCommission = 0

              for (const transaction of machineTransactions) {
                const productMatch = transaction.product_name?.match(/\((\d+)\s*=\s*([\d.]+)\)/)
                if (productMatch) {
                  const mdbCode = productMatch[1]
                  const salesAmount = parseFloat(productMatch[2])
                  
                  const slotConfig = referredMachine.slot_configuration
                  if (slotConfig && slotConfig.rows && Array.isArray(slotConfig.rows)) {
                    // Extract slots from the rows structure
                    const slots = slotConfig.rows.flatMap((row: any) => row.slots || [])
                    const product = slots.find((p: any) => p.mdb_code === mdbCode)
                    if (product) {
                      const basePrice = parseFloat(product.base_price) || 0
                      const referralCommissionPercent = parseFloat((referredMachine.customers as any)?.referral_commission_percent) || 0
                      
                      // Ensure we have valid numbers
                      if (!isNaN(basePrice) && !isNaN(referralCommissionPercent)) {
                        const commission = (basePrice * referralCommissionPercent) / 100
                        if (!isNaN(commission)) {
                          machineReferralCommission += commission
                        }
                      }
                    }
                  }
                }
              }

              // Ensure we have valid numbers before adding to totals
              if (!isNaN(machineReferralCommission)) {
                totalReferralCommission += machineReferralCommission
              }

              // Add to breakdown
              commissionBreakdown.push({
                machineId: referredMachine.id,
                machineName: `${referredMachine.host_business_name} - ${referredMachine.machine_placement_area}`,
                companyName: (referredMachine.companies as any)?.name || 'Unknown Company',
                commissionType: 'Referral',
                commission: machineReferralCommission || 0,
                productsSold: 0, // Not tracking products sold for referrals
                transactions: machineTransactions.length
              })
            }
          }
        }
      }
    }

    const totalCommission = totalMachineCommission + totalReferralCommission

    // Ensure all values are valid numbers
    const finalMachineSalesCommission = isNaN(totalMachineCommission) ? 0 : totalMachineCommission
    const finalReferralCommission = isNaN(totalReferralCommission) ? 0 : totalReferralCommission
    const finalTotalCommission = isNaN(totalCommission) ? 0 : totalCommission
    const finalTotalProductsSold = isNaN(totalProductsSold) ? 0 : totalProductsSold
    const finalTotalTransactions = isNaN(totalTransactions) ? 0 : totalTransactions

    console.log('Commission calculation complete:', {
      machineSalesCommission: finalMachineSalesCommission,
      referralCommission: finalReferralCommission,
      totalCommission: finalTotalCommission,
      totalProductsSold: finalTotalProductsSold,
      totalTransactions: finalTotalTransactions,
      machineCount: customerMachines.length
    })

    const response = {
      machineSalesCommission: finalMachineSalesCommission,
      referralCommission: finalReferralCommission,
      totalCommission: finalTotalCommission,
      totalProductsSold: finalTotalProductsSold,
      totalTransactions: finalTotalTransactions,
      machineCount: customerMachines.length,
      commissionBreakdown
    }

    console.log('API Response:', JSON.stringify(response, null, 2))
    console.log('=== COMMISSION API DEBUG END ===')

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in commission calculation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 