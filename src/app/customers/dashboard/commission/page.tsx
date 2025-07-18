'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'

interface PayoutRequest {
  id: string
  customer_id: string
  company_id: string
  amount: number
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected'
  requested_at: string
  processed_at?: string
  notes?: string
}

interface MachineCommissionData {
  totalCommission: number
  totalMachineCommission: number
  totalReferralCommission: number
  totalProductsSold: number
  totalTransactions: number
  machineCount: number
  pendingCashouts?: number
  totalCashouts?: number
  lifetimeEarnings?: number
  commissionBreakdown: Array<{
    machineId: string
    machineName: string
    companyName: string
    commissionType: string
    commission: number
    productsSold: number
    transactions: number
  }>
}

export default function CommissionPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [commissionData, setCommissionData] = useState<MachineCommissionData | null>(null)

  useEffect(() => {
    if (user) {
      loadCommissionData()
    }
  }, [user])

  const loadCommissionData = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      const response = await fetch('/api/customer-machine-commission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: user.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch commission data')
      }

      const data = await response.json()

      // Get customer's payout requests to calculate pending and total cashouts
      const { data: payoutRequests, error: requestsError } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('customer_id', user.id)

      if (requestsError) {
        console.error('Error fetching payout requests:', requestsError)
      }

      // Calculate pending and total cashouts
      const allRequests = (payoutRequests || []) as PayoutRequest[]
      
      // Debug: Log all requests and their statuses
      console.log('All payout requests (commission page):', allRequests.map(r => ({ id: r.id, status: r.status, amount: r.amount })))
      
      const pendingCashouts = allRequests
        .filter((r: PayoutRequest) => r.status === 'pending' || r.status === 'approved' || r.status === 'processing')
        .reduce((sum: number, r: PayoutRequest) => sum + r.amount, 0)
      
      const totalCashouts = allRequests
        .filter((r: PayoutRequest) => r.status === 'completed')
        .reduce((sum: number, r: PayoutRequest) => sum + r.amount, 0)
        
      console.log('Pending cashouts (commission page):', pendingCashouts, 'Total cashouts:', totalCashouts)

      // Adjust commission data to account for both completed and pending cashouts
      const adjustedData = {
        ...data,
        totalCommission: Math.max(0, data.totalCommission - totalCashouts - pendingCashouts),
        totalMachineCommission: data.machineSalesCommission || 0,
        totalReferralCommission: data.referralCommission || 0,
        lifetimeEarnings: data.totalCommission || 0,
        pendingCashouts,
        totalCashouts
      }

      setCommissionData(adjustedData)
    } catch (error) {
      console.error('Error loading commission data:', error)
      showToast('Failed to load commission data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Commission</h1>
        <p className="text-gray-600 mt-2">Track your machine sales commission earnings</p>
      </div>

      {/* Key Metrics Cards */}
      {commissionData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Available Commission</p>
              <p className="text-2xl font-semibold text-green-600">{formatCurrency(commissionData.totalCommission)}</p>
              <p className="text-xs text-gray-500 mt-1">Ready to cash out</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Pending Cashouts</p>
              <p className="text-2xl font-semibold text-orange-600">{formatCurrency(commissionData.pendingCashouts || 0)}</p>
              <p className="text-xs text-gray-500 mt-1">In process</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Cashouts</p>
              <p className="text-2xl font-semibold text-blue-600">{formatCurrency(commissionData.totalCashouts || 0)}</p>
              <p className="text-xs text-gray-500 mt-1">Historical</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Lifetime Earnings</p>
              <p className="text-2xl font-semibold text-purple-600">{formatCurrency(commissionData.lifetimeEarnings || commissionData.totalCommission)}</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>
          </div>
        </div>
      )}

      {/* Commission Breakdown Cards */}
      {commissionData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Machine Sales Commission</p>
              <p className="text-2xl font-semibold text-blue-600">{formatCurrency(commissionData.totalMachineCommission)}</p>
            </div>
        </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Referral Commission</p>
              <p className="text-2xl font-semibold text-green-600">{formatCurrency(commissionData.totalReferralCommission)}</p>
            </div>
          </div>
              </div>
            )}

      {/* Additional Stats */}
      {commissionData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Products Sold</p>
              <p className="text-2xl font-semibold text-gray-900">{commissionData.totalProductsSold.toLocaleString()}</p>
              </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-semibold text-gray-900">{commissionData.totalTransactions.toLocaleString()}</p>
            </div>
                              </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Active Machines</p>
              <p className="text-2xl font-semibold text-gray-900">{commissionData.machineCount}</p>
                    </div>
                  </div>
                </div>
              )}

      {/* Commission Breakdown by Machine */}
      {commissionData && commissionData.commissionBreakdown.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Commission by Machine</h3>
                  </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Machine
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Products Sold
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transactions
                  </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                {commissionData.commissionBreakdown.map((machine) => (
                  <tr key={machine.machineId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {machine.machineName}
                              </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {machine.companyName}
                              </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {machine.commissionType}
                              </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                      {formatCurrency(machine.commission)}
                              </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                      {machine.productsSold.toLocaleString()}
                              </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                      {machine.transactions.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                </div>
              )}

      {/* Empty State */}
      {commissionData && commissionData.totalCommission === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Commission Earned Yet</h3>
          <p className="text-gray-500">Commission will appear here once your machines start generating sales.</p>
        </div>
      )}
    </div>
  )
} 