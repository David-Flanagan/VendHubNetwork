'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/date-utils'

type TimePeriod = 'today' | 'yesterday' | 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'custom'

interface TimeRange {
  start: Date
  end: Date
}

export default function MachineSalesPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [machines, setMachines] = useState<any[]>([])
  const [selectedMachine, setSelectedMachine] = useState<string>('all')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today')
  const [customDateRange, setCustomDateRange] = useState<TimeRange>({
    start: new Date(),
    end: new Date()
  })
  const [salesData, setSalesData] = useState<any[]>([])
  const [salesLoading, setSalesLoading] = useState(false)
  const [includeFailed, setIncludeFailed] = useState(false)

  useEffect(() => {
    if (user?.id) {
      fetchMachines()
    }
  }, [user])

  useEffect(() => {
    if (machines.length > 0 && !loading) {
      fetchSalesData()
    }
  }, [machines, loading])

  useEffect(() => {
    if (machines.length > 0 && !loading) {
      fetchSalesData()
    }
  }, [includeFailed]) // Refetch when includeFailed changes

  const fetchMachines = async () => {
    try {
      if (!user?.id) return

      // Fetch machines where customer_id matches OR referral_user_id matches
      const { data, error } = await supabase
        .from('customer_machines')
        .select(`
          id,
          machine_name,
          host_business_name,
          machine_placement_area,
          nayax_machine_id,
          company_id,
          approval_status,
          slot_configuration,
          companies!inner(name, logo_url)
        `)
        .or(`customer_id.eq.${user.id},referral_user_id.eq.${user.id}`)
        .eq('approval_status', 'approved')

      if (error) throw error

      console.log('Fetched machines from database:', data?.map(m => ({
        id: m.id,
        machineName: m.machine_name,
        businessName: m.host_business_name,
        placementArea: m.machine_placement_area,
        nayaxId: m.nayax_machine_id,
        companyId: m.company_id,
        companyName: (m.companies as any)?.name || 'Unknown Company',
        hasSlotConfig: !!m.slot_configuration
      })))

      setMachines(data || [])
    } catch (error) {
      console.error('Error fetching machines:', error)
      showToast('Error loading machines', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getTimeRange = (period: TimePeriod): TimeRange => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (period) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) }
      case 'yesterday':
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        return { start: yesterday, end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1) }
      case 'this-week':
        const startOfWeek = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000)
        return { start: startOfWeek, end: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1) }
      case 'last-week':
        const lastWeekStart = new Date(today.getTime() - (today.getDay() + 7) * 24 * 60 * 60 * 1000)
        return { start: lastWeekStart, end: new Date(lastWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1) }
      case 'this-month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        return { start: startOfMonth, end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59) }
      case 'last-month':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return { start: lastMonthStart, end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) }
      case 'this-year':
        const startOfYear = new Date(now.getFullYear(), 0, 1)
        return { start: startOfYear, end: new Date(now.getFullYear(), 11, 31, 23, 59, 59) }
      case 'last-year':
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
        return { start: lastYearStart, end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59) }
      case 'custom':
        return customDateRange
      default:
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) }
    }
  }

  const formatTransactionTime = (transaction: any): string => {
    // Use authorization_datetime from database
    if (transaction.authorization_datetime) {
      return new Date(transaction.authorization_datetime).toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    }
    return 'N/A'
  }

  const formatAmount = (amount: any): string => {
    if (amount === null || amount === undefined) return 'N/A'
    return `$${parseFloat(amount).toFixed(2)}`
  }



  // Get proper product name
  const getProductName = (transaction: any, mappedMachine: any): string => {
    const nayaxProductName = transaction.ProductName
    if (!nayaxProductName) return 'Unknown Product'
    
    console.log('Processing product:', nayaxProductName)
    
    // Extract MDB code from Nayax product name
    const mdbCode = extractMdbCode(nayaxProductName)
    console.log('Extracted MDB code:', mdbCode)
    
    if (!mdbCode) {
      // Fallback to clean Nayax name if no MDB code found
      const fallbackName = nayaxProductName.replace(/\(\d+\s*=\s*\d+\.\d+\)\s*\n?/g, '').trim() || 'Unknown Product'
      console.log('No MDB code found, using fallback:', fallbackName)
      return fallbackName
    }
    
    // If no mapped machine, fallback to clean Nayax name
    if (!mappedMachine) {
      const fallbackName = nayaxProductName.replace(/\(\d+\s*=\s*\d+\.\d+\)\s*\n?/g, '').trim() || 'Unknown Product'
      console.log('No mapped machine, using fallback:', fallbackName)
      return fallbackName
    }
    
    // Get the actual machine data from machines array
    const machine = machines.find(m => m.id === mappedMachine.id)
    if (!machine) {
      const fallbackName = nayaxProductName.replace(/\(\d+\s*=\s*\d+\.\d+\)\s*\n?/g, '').trim() || 'Unknown Product'
      console.log('Machine not found in machines array, using fallback:', fallbackName)
      return fallbackName
    }
    
    console.log('Found machine:', machine.machine_name)
    console.log('Machine slot configuration:', machine.slot_configuration)
    
    // Look up product name from slot configuration
    const productName = getProductNameFromSlotConfig(machine, mdbCode)
    console.log('Product name from slot config:', productName)
    return productName
  }

  // Get vending price from slot configuration
  const getVendingPrice = (transaction: any, mappedMachine: any): string => {
    const nayaxProductName = transaction.ProductName
    if (!nayaxProductName) return 'N/A'
    
    const mdbCode = extractMdbCode(nayaxProductName)
    if (!mdbCode || !mappedMachine) {
      return 'N/A'
    }
    
    const machine = machines.find(m => m.id === mappedMachine.id)
    if (!machine?.slot_configuration) {
      return 'N/A'
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
          return formatAmount(slot.final_price)
        }
      }
      
      return 'N/A'
    } catch (error) {
      console.warn('Error getting vending price:', error)
      return 'N/A'
    }
  }

  // Get commission amount from slot configuration
  const getCommissionAmount = (transaction: any, mappedMachine: any): string => {
    const nayaxProductName = transaction.ProductName
    if (!nayaxProductName) return 'N/A'
    
    const mdbCode = extractMdbCode(nayaxProductName)
    if (!mdbCode || !mappedMachine) {
      return 'N/A'
    }
    
    const machine = machines.find(m => m.id === mappedMachine.id)
    if (!machine?.slot_configuration) {
      return 'N/A'
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
          return formatAmount(slot.commission_amount)
        }
      }
      
      return 'N/A'
    } catch (error) {
      console.warn('Error getting commission amount:', error)
      return 'N/A'
    }
  }

  // Determine transaction status based on settlement_value
  const getTransactionStatus = (transaction: any): { status: string; color: string } => {
    // Use the transactionStatus field from the API response
    const status = transaction.transactionStatus || transaction.transaction_status
    
    if (status === 'completed' || status === 'Completed') {
      return { status: 'Completed', color: 'text-green-600' }
    } else if (status === 'failed' || status === 'Failed') {
      return { status: 'Failed', color: 'text-red-600' }
    } else {
      // Fallback to settlement value check
      const settlementValue = parseFloat(transaction.settlement_value || transaction.SettlementValue || 0)
      if (settlementValue > 0) {
        return { status: 'Completed', color: 'text-green-600' }
      } else {
        return { status: 'Failed', color: 'text-red-600' }
      }
    }
  }

  // Machine mapping function
  const mapNayaxMachineToOurMachine = (transaction: any) => {
    const nayaxMachineId = transaction.MachineID
    if (nayaxMachineId) {
      // Try exact match first
      let machine = machines.find(m => m.nayax_machine_id === nayaxMachineId)
      
      // If no exact match, try string comparison
      if (!machine) {
        machine = machines.find(m => String(m.nayax_machine_id) === String(nayaxMachineId))
      }
      
      // If still no match, try number comparison
      if (!machine) {
        machine = machines.find(m => Number(m.nayax_machine_id) === nayaxMachineId)
      }
      
      if (machine) {
        const displayName = `${machine.host_business_name} - ${machine.machine_placement_area}`
        return {
          id: machine.id,
          displayName,
          businessName: machine.host_business_name,
          placementArea: machine.machine_placement_area,
          companyName: (machine.companies as any)?.name
        }
      }
    }
    
    console.warn('No machine found for transaction:', transaction)
    return null
  }

  const handleTimePeriodChange = (period: TimePeriod) => {
    setTimePeriod(period)
    fetchSalesData()
  }

  const handleMachineChange = (machineId: string) => {
    setSelectedMachine(machineId)
    fetchSalesData()
  }

  const fetchSalesData = async () => {
    try {
      setSalesLoading(true)
      
      if (!user?.id) {
        showToast('User not authenticated', 'error')
        return
      }

      // Get time range for the selected period
      const timeRange = getTimeRange(timePeriod)
      const startDate = timeRange.start.toISOString()
      const endDate = timeRange.end.toISOString()

      console.log('Fetching sales data from database')
      console.log('Date range:', startDate, 'to', endDate)
      console.log('Machine filter:', selectedMachine)
      
      // Fetch data from database using new API
      const response = await fetch('/api/customer-sales-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: user.id,
          startDate,
          endDate,
          machineId: selectedMachine,
          includeFailed: includeFailed
        })
      })

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Database Response:', data)
      
      // Set the processed transactions
      setSalesData(data.transactions || [])
      
      showToast(`Loaded ${data.transactions?.length || 0} transactions from database`, 'success')

    } catch (error) {
      console.error('Error fetching sales data:', error)
      showToast(`Error loading sales data: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    } finally {
      setSalesLoading(false)
    }
  }

  const testNayaxAPI = async () => {
    try {
      if (!user?.id || machines.length === 0) {
        showToast('No machines available for testing', 'error')
        return
      }

      // Get the first machine with a Nayax machine ID
      const machineWithNayaxId = machines.find(m => m.nayax_machine_id)
      if (!machineWithNayaxId) {
        console.log('Available machines:', machines.map(m => ({
          id: m.id,
          name: m.machine_name,
          companyId: m.company_id,
          nayaxId: m.nayax_machine_id
        })))
        showToast('No machines with Nayax ID found. Please ensure machines have been approved and have Nayax machine IDs.', 'error')
        return
      }

      console.log('Looking for token for company ID:', machineWithNayaxId.company_id)
      
      // Get the operator's Nayax API token using secure server-side route
      const tokenResponse = await fetch(`/api/get-operator-token?companyId=${machineWithNayaxId.company_id}`)
      
      if (!tokenResponse.ok) {
        let errorMessage = 'Unknown error'
        try {
          const errorData = await tokenResponse.json()
          errorMessage = errorData.error || errorData.details || 'Unknown error'
        } catch (e) {
          errorMessage = `Server error: ${tokenResponse.status} ${tokenResponse.statusText}`
        }
        
        console.log('Token lookup failed:', { 
          companyId: machineWithNayaxId.company_id, 
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          error: errorMessage
        })
        
        if (tokenResponse.status === 500) {
          showToast('Server configuration error. Please check environment variables.', 'error')
        } else {
          showToast(`No Nayax API token found for operator (Company ID: ${machineWithNayaxId.company_id}). Please have the operator set up their API token in Settings > Integrations.`, 'error')
        }
        return
      }

      const tokenData = await tokenResponse.json()
      console.log('Token retrieved successfully:', { tokenMasked: tokenData.tokenMasked })

      console.log('Testing Nayax API with:', {
        machineId: machineWithNayaxId.nayax_machine_id,
        companyId: machineWithNayaxId.company_id,
        tokenMasked: tokenData.tokenMasked
      })

      // Make API call to Nayax
      const timeRange = getTimeRange(timePeriod)
      const startDate = timeRange.start.toISOString().split('T')[0]
      const endDate = timeRange.end.toISOString().split('T')[0]

      const response = await fetch(`/api/test-nayax?machineId=${machineWithNayaxId.nayax_machine_id}&startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenData.token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Nayax API Response:', data)
      showToast('API test completed - check console for data structure', 'success')

    } catch (error) {
      console.error('Error testing Nayax API:', error)
      showToast(`API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Machine Sales</h1>
          <p className="text-gray-600">View sales data and performance metrics for your vending machines.</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Machine Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Machine
              </label>
              <select
                value={selectedMachine}
                onChange={(e) => handleMachineChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Machines</option>
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.host_business_name} - {machine.machine_placement_area}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Period Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Period
              </label>
              <select
                value={timePeriod}
                onChange={(e) => handleTimePeriodChange(e.target.value as TimePeriod)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this-week">This Week</option>
                <option value="last-week">Last Week</option>
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="this-year">This Year</option>
                <option value="last-year">Last Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range */}
            {timePeriod === 'custom' && (
              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={customDateRange.start.toISOString().split('T')[0]}
                    onChange={(e) => setCustomDateRange(prev => ({
                      ...prev,
                      start: new Date(e.target.value)
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="date"
                    value={customDateRange.end.toISOString().split('T')[0]}
                    onChange={(e) => setCustomDateRange(prev => ({
                      ...prev,
                      end: new Date(e.target.value)
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Include Failed Transactions Toggle */}
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Filter
              </label>
              <div className="flex items-center space-x-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeFailed}
                    onChange={(e) => setIncludeFailed(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include Failed Transactions</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Failed transactions are excluded from commission calculations
              </p>
            </div>
          </div>

          {/* Selected Time Range Display */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Showing data from <span className="font-medium">{formatDate(getTimeRange(timePeriod).start)}</span> to{' '}
              <span className="font-medium">{formatDate(getTimeRange(timePeriod).end)}</span>
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={fetchSalesData}
                disabled={salesLoading}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salesLoading ? 'Loading...' : 'Refresh Data'}
              </button>
              <button
                onClick={testNayaxAPI}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Test Nayax API
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/sync-all-machines', { method: 'POST' })
                    const data = await response.json()
                    console.log('Background sync result:', data)
                    showToast(`Background sync completed: ${data.totalTransactions} transactions`, 'success')
                  } catch (error) {
                    console.error('Background sync error:', error)
                    showToast('Background sync failed', 'error')
                  }
                }}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                Run Background Sync
              </button>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Transactions */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Transactions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {salesLoading ? '...' : salesData.length}
                </p>
              </div>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {salesLoading ? '...' : formatAmount(
                    salesData.reduce((sum, t) => sum + (parseFloat(t.authorization_value || 0) || 0), 0)
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Total Commission */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Commission</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {salesLoading ? '...' : formatAmount(
                    salesData.reduce((sum, t) => {
                      const commission = t.commissionAmount?.replace('$', '') || '0'
                      return sum + (parseFloat(commission) || 0)
                    }, 0)
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Average Transaction */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Transaction</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {salesLoading ? '...' : salesData.length > 0 ? formatAmount(
                    salesData.reduce((sum, t) => sum + (parseFloat(t.authorization_value || 0) || 0), 0) / salesData.length
                  ) : '$0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Sales Chart */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h3>
            <div className="h-32 bg-gray-100 rounded flex items-center justify-center">
              <p className="text-gray-500">Sales chart will be displayed here</p>
            </div>
          </div>

          {/* Product Volume Chart */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Volume</h3>
            <div className="h-32 bg-gray-100 rounded flex items-center justify-center">
              <p className="text-gray-500">Product volume chart will be displayed here</p>
            </div>
          </div>

          {/* Commission Chart */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Earned</h3>
            <div className="h-32 bg-gray-100 rounded flex items-center justify-center">
              <p className="text-lg font-semibold text-gray-900">
                {salesLoading ? '...' : formatAmount(
                  salesData.reduce((sum, t) => {
                    const commission = t.commissionAmount?.replace('$', '') || '0'
                    return sum + (parseFloat(commission) || 0)
                  }, 0)
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Sales Data Table */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Transaction Data</h3>
            <p className="text-sm text-gray-600 mt-1">
              Detailed transaction records for the selected time period
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Machine
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vending Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actual Machine Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Method
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salesLoading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-lg font-medium">Loading sales data...</p>
                        <p className="text-sm">Fetching transaction data from Nayax API</p>
                      </div>
                    </td>
                  </tr>
                ) : salesData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="text-lg font-medium">No sales data available</p>
                        <p className="text-sm">No transactions found for the selected time period</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  salesData.map((transaction, index) => {
                    return (
                      <tr key={transaction.transaction_id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTransactionTime(transaction)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.mappedMachine ? transaction.mappedMachine.displayName : 'Unknown Machine'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.mappedProductName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {transaction.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {transaction.vendingPrice}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {transaction.formattedAuthorizationValue}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.commissionAmount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`font-medium ${transaction.transaction_status === 'completed' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.transaction_status === 'completed' ? 'Completed' : 'Failed'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.payment_method || 'Unknown'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
} 