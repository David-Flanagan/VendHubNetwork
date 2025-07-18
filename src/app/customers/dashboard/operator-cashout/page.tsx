'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'

interface OperatorInfo {
  id: string
  name: string
  logo_url?: string
  contact_email?: string
  contact_phone?: string
  website?: string
}

interface PayoutMethod {
  id: string
  name: string
  display_name: string
  description: string
}

interface OperatorPayoutSetting {
  id: string
  company_id: string
  payout_method_id: string
  is_enabled: boolean
  minimum_amount: number
  processing_fee_percentage: number
  processing_fee_fixed: number
  processing_time_days: number
  custom_fields: any
  payout_methods: PayoutMethod
}

interface OperatorCommissionData {
  operatorId: string
  operatorName: string
  availableCommission: number
  pendingCashouts: number
  totalCashouts: number
  lifetimeEarnings: number
  machineCount?: number
  totalTransactions?: number
  commissionBreakdown?: any[]
  payoutSettings: OperatorPayoutSetting[]
  payoutRequests: any[]
}

export default function OperatorCashoutPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [operators, setOperators] = useState<OperatorInfo[]>([])
  const [selectedOperator, setSelectedOperator] = useState<string>('')
  const [operatorData, setOperatorData] = useState<OperatorCommissionData | null>(null)
  const [loadingOperatorData, setLoadingOperatorData] = useState(false)
  const [showCashoutModal, setShowCashoutModal] = useState(false)
  const [selectedPayoutMethod, setSelectedPayoutMethod] = useState<OperatorPayoutSetting | null>(null)
  const [cashoutAmount, setCashoutAmount] = useState<number>(0)
  const [submittingCashout, setSubmittingCashout] = useState(false)

  useEffect(() => {
    if (user) {
      loadOperators()
    }
  }, [user])

  useEffect(() => {
    if (selectedOperator) {
      loadOperatorData(selectedOperator)
    }
  }, [selectedOperator])

  const loadOperators = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Get the customer's machines and their associated companies
      const { data: customerMachines, error: machinesError } = await supabase
        .from('customer_machines')
        .select(`
          id,
          company_id,
          companies (
            id,
            name,
            logo_url,
            contact_email,
            contact_phone,
            website
          )
        `)
        .eq('customer_id', user.id)

      if (machinesError) {
        console.error('Supabase error:', machinesError)
        throw machinesError
      }

      console.log('Customer machines data:', customerMachines)

      // Get unique companies from customer's machines
      const companies = customerMachines
        ?.map(cm => cm.companies)
        .filter((company): company is any => !!company)
        .filter((company, index, arr) => 
          arr.findIndex(c => c?.id === company?.id) === index
        ) as OperatorInfo[];

      console.log('Extracted companies:', companies)

      setOperators(companies || [])
      
      // Select first operator by default
      if (companies && companies.length > 0) {
        setSelectedOperator(companies[0].id)
      }
    } catch (error) {
      console.error('Error loading operators:', error)
      showToast('Failed to load operators', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadOperatorData = async (operatorId: string) => {
    if (!user) return

    try {
      setLoadingOperatorData(true)
      
      console.log('Loading operator data for operatorId:', operatorId)
      console.log('User ID:', user.id)
      
      // Call the same API as commission page but for specific operator
      const response = await fetch('/api/customer-machine-commission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: user.id,
          operatorId: operatorId, // Add operator filter
        }),
      })

      console.log('API Response status:', response.status)
      console.log('API Response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error response:', errorText)
        throw new Error('Failed to fetch operator commission data')
      }

      const data = await response.json()
      console.log('API Response data:', data)
      console.log('Commission breakdown:', data.commissionBreakdown)
      console.log('Machine count:', data.machineCount)
      console.log('Total transactions:', data.totalTransactions)
      
      // For now, use the same commission data but we'll need to extend the API
      // to include cashout history and operator-specific settings
      const operator = operators.find(op => op.id === operatorId)
      
      // Get operator's payout settings
      const { data: payoutSettings, error: payoutError } = await supabase
        .from('operator_payout_settings')
        .select(`
          *,
          payout_methods (*)
        `)
        .eq('company_id', operatorId)
        .eq('is_enabled', true)

      if (payoutError) {
        console.error('Error fetching payout settings:', payoutError)
      }

      // Get customer's payout requests for this operator
      const { data: payoutRequests, error: requestsError } = await supabase
        .from('payout_requests')
        .select(`
          *,
          payout_methods(display_name)
        `)
        .eq('customer_id', user.id)
        .eq('company_id', operatorId)
        .order('requested_at', { ascending: false })

      if (requestsError) {
        console.error('Error fetching payout requests:', requestsError)
      }

      // Calculate pending and total cashouts
      const allRequests = payoutRequests || []
      
      // Debug: Log all requests and their statuses
      console.log('All payout requests:', allRequests.map(r => ({ id: r.id, status: r.status, amount: r.amount })))
      
      const pendingCashouts = allRequests
        .filter(r => r.status === 'pending' || r.status === 'approved' || r.status === 'processing')
        .reduce((sum, r) => sum + r.amount, 0)
      
      const totalCashouts = allRequests
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + r.amount, 0)
        
      console.log('Pending cashouts:', pendingCashouts, 'Total cashouts:', totalCashouts)
      console.log('Lifetime earnings (totalCommission):', data.totalCommission || 0)

      // Calculate available commission by subtracting both completed and pending cashouts
      const totalCommission = data.totalCommission || 0
      const availableCommission = Math.max(0, totalCommission - totalCashouts - pendingCashouts)
      console.log('Available commission calculation:', totalCommission, '-', totalCashouts, '-', pendingCashouts, '=', availableCommission)

      const operatorData: OperatorCommissionData = {
        operatorId,
        operatorName: operator?.name || 'Unknown Operator',
        availableCommission: availableCommission,
        pendingCashouts: pendingCashouts,
        totalCashouts: totalCashouts,
        lifetimeEarnings: totalCommission, // Keep lifetime earnings as total commission
        machineCount: data.machineCount || 0,
        totalTransactions: data.totalTransactions || 0,
        commissionBreakdown: data.commissionBreakdown || [],
        payoutSettings: payoutSettings || [],
        payoutRequests: allRequests
      }
      
      setOperatorData(operatorData)
    } catch (error) {
      console.error('Error loading operator data:', error)
      showToast('Failed to load operator data', 'error')
    } finally {
      setLoadingOperatorData(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const handleCashoutRequest = (payoutMethod: OperatorPayoutSetting) => {
    setSelectedPayoutMethod(payoutMethod)
    setCashoutAmount(operatorData?.availableCommission || 0)
    setShowCashoutModal(true)
  }

  const submitCashoutRequest = async () => {
    if (!user || !selectedPayoutMethod || !operatorData) return

    try {
      setSubmittingCashout(true)

      const response = await fetch('/api/customer-cashout-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: user.id,
          operatorId: operatorData.operatorId,
          payoutMethodId: selectedPayoutMethod.payout_method_id,
          amount: cashoutAmount,
          payoutMethodName: selectedPayoutMethod.payout_methods.display_name
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit cashout request')
      }

      const result = await response.json()
      
      showToast(`Cashout request submitted successfully! You'll receive $${formatCurrency(result.cashoutRequest.netAmount)} via ${selectedPayoutMethod.payout_methods.display_name}`, 'success')
      
      // Close modal and refresh data
      setShowCashoutModal(false)
      setSelectedPayoutMethod(null)
      setCashoutAmount(0)
      
      // Refresh operator data to show updated commission
      await loadOperatorData(operatorData.operatorId)

    } catch (error) {
      console.error('Error submitting cashout request:', error)
      showToast(error instanceof Error ? error.message : 'Failed to submit cashout request', 'error')
    } finally {
      setSubmittingCashout(false)
    }
  }

  const calculateProcessingFee = (amount: number, method: OperatorPayoutSetting) => {
    const percentageFee = (amount * method.processing_fee_percentage) / 100
    const fixedFee = method.processing_fee_fixed
    return percentageFee + fixedFee
  }

  const calculateNetAmount = (amount: number, method: OperatorPayoutSetting) => {
    return amount - calculateProcessingFee(amount, method)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (operators.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Operator Cashout</h1>
          <p className="text-gray-600 mt-2">Manage cashouts with specific operators</p>
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Operators Found</h3>
          <p className="text-gray-500">You don't have any machines associated with operators yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Operator Cashout</h1>
        <p className="text-gray-600 mt-2">Manage cashouts with specific operators</p>
      </div>

      {/* Operator Selection */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Operator</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {operators.map((operator) => (
            <button
              key={operator.id}
              onClick={() => setSelectedOperator(operator.id)}
              className={`p-4 rounded-lg border-2 transition-colors ${
                selectedOperator === operator.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  {operator.logo_url ? (
                    <img 
                      src={operator.logo_url} 
                      alt={operator.name}
                      className="w-6 h-6 object-contain"
                    />
                  ) : (
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  )}
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">{operator.name}</p>
                  <p className="text-sm text-gray-500">{operator.contact_email}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Debug Information */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-8">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Debug Info</h3>
        <div className="text-sm text-yellow-700">
          <p>Machine Count: {operatorData?.machineCount || 'N/A'}</p>
          <p>Total Transactions: {operatorData?.totalTransactions || 'N/A'}</p>
          <p>Available Commission: ${operatorData?.availableCommission || 0}</p>
          <p>Commission Breakdown: {JSON.stringify(operatorData?.commissionBreakdown || [], null, 2)}</p>
        </div>
      </div>

      {/* Operator Commission Data */}
      {operatorData && (
        <>
          {/* Commission Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Available Commission</p>
                <p className="text-2xl font-semibold text-green-600">{formatCurrency(operatorData.availableCommission)}</p>
                <p className="text-xs text-gray-500 mt-1">Ready to cash out</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Pending Cashouts</p>
                <p className="text-2xl font-semibold text-orange-600">{formatCurrency(operatorData.pendingCashouts)}</p>
                <p className="text-xs text-gray-500 mt-1">In process</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total Cashouts</p>
                <p className="text-2xl font-semibold text-blue-600">{formatCurrency(operatorData.totalCashouts)}</p>
                <p className="text-xs text-gray-500 mt-1">Historical</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Lifetime Earnings</p>
                <p className="text-2xl font-semibold text-purple-600">{formatCurrency(operatorData.lifetimeEarnings)}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
            </div>
          </div>

          {/* Payout Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Payout Methods */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Payout Methods</h3>
              {operatorData.payoutSettings.length > 0 ? (
                <div className="space-y-4">
                  {operatorData.payoutSettings.map((setting) => (
                    <div key={setting.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">{setting.payout_methods.display_name}</h4>
                        <span className="text-sm text-green-600 font-medium">Available</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{setting.payout_methods.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Minimum:</span>
                          <span className="ml-2 font-medium">{formatCurrency(setting.minimum_amount)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Processing:</span>
                          <span className="ml-2 font-medium">
                            {setting.processing_fee_percentage > 0 && `${setting.processing_fee_percentage}%`}
                            {setting.processing_fee_percentage > 0 && setting.processing_fee_fixed > 0 && ' + '}
                            {setting.processing_fee_fixed > 0 && formatCurrency(setting.processing_fee_fixed)}
                            {setting.processing_fee_percentage === 0 && setting.processing_fee_fixed === 0 && 'Free'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Time:</span>
                          <span className="ml-2 font-medium">{setting.processing_time_days} business days</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <p className="text-gray-500">No payout methods configured by this operator</p>
                </div>
              )}
            </div>

            {/* Cashout Request History */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cashout Request History</h3>
              {operatorData.payoutRequests.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <p className="text-gray-500">No cashout requests yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {operatorData.payoutRequests.map((request) => (
                    <div key={request.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${
                            request.status === 'pending' ? 'bg-yellow-400' :
                            request.status === 'approved' ? 'bg-blue-400' :
                            request.status === 'processing' ? 'bg-purple-400' :
                            request.status === 'completed' ? 'bg-green-400' :
                            'bg-red-400'
                          }`}></span>
                          <span className="text-sm font-medium text-gray-900">
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(request.requested_at).toLocaleDateString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>{formatCurrency(request.amount)} via {request.payout_methods?.display_name || 'Unknown Method'}</p>
                        {request.notes && (
                          <p className="text-xs text-gray-500 mt-1">Note: {request.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cashout Actions */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Cashout</h3>
            {operatorData.payoutSettings.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Available for cashout: <span className="font-semibold text-gray-900">{formatCurrency(operatorData.availableCommission)}</span></p>
                    <p className="text-sm text-gray-500">Select a payout method below</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {operatorData.payoutSettings.map((setting) => {
                    const canRequest = operatorData.availableCommission >= setting.minimum_amount
                    return (
                      <button
                        key={setting.id}
                        disabled={!canRequest}
                        onClick={() => canRequest && handleCashoutRequest(setting)}
                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 disabled:border-gray-100 disabled:bg-gray-50 disabled:cursor-not-allowed text-left transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{setting.payout_methods.display_name}</h4>
                          {!canRequest && (
                            <span className="text-xs text-red-600">Min: {formatCurrency(setting.minimum_amount)}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {setting.processing_fee_percentage > 0 && `${setting.processing_fee_percentage}% fee`}
                          {setting.processing_fee_percentage > 0 && setting.processing_fee_fixed > 0 && ' + '}
                          {setting.processing_fee_fixed > 0 && `${formatCurrency(setting.processing_fee_fixed)} fee`}
                          {setting.processing_fee_percentage === 0 && setting.processing_fee_fixed === 0 && 'No fees'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{setting.processing_time_days} business days</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No payout methods available. Contact the operator to set up payout options.</p>
              </div>
            )}
          </div>
        </>
      )}

      {loadingOperatorData && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cashout Request Modal */}
      {showCashoutModal && selectedPayoutMethod && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Request Cashout via {selectedPayoutMethod.payout_methods.display_name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to Cashout
                </label>
                <input
                  type="number"
                  min={selectedPayoutMethod.minimum_amount}
                  max={operatorData?.availableCommission || 0}
                  step="0.01"
                  value={cashoutAmount}
                  onChange={(e) => setCashoutAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Min: {formatCurrency(selectedPayoutMethod.minimum_amount)} | 
                  Max: {formatCurrency(operatorData?.availableCommission || 0)}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Breakdown</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Requested Amount:</span>
                    <span>{formatCurrency(cashoutAmount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Processing Fee:</span>
                    <span>-{formatCurrency(calculateProcessingFee(cashoutAmount, selectedPayoutMethod))}</span>
                  </div>
                  <div className="border-t pt-1 flex justify-between font-medium">
                    <span>You'll Receive:</span>
                    <span className="text-green-600">{formatCurrency(calculateNetAmount(cashoutAmount, selectedPayoutMethod))}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Processing time: {selectedPayoutMethod.processing_time_days} business days
                </p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCashoutModal(false)
                  setSelectedPayoutMethod(null)
                  setCashoutAmount(0)
                }}
                disabled={submittingCashout}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitCashoutRequest}
                disabled={submittingCashout || cashoutAmount < selectedPayoutMethod.minimum_amount || cashoutAmount > (operatorData?.availableCommission || 0)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingCashout ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 