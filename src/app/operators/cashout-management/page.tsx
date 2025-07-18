'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'

interface PayoutRequest {
  id: string
  customer_id: string
  amount: number
  processing_fee: number
  net_amount: number
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected'
  requested_at: string
  processed_at?: string
  notes?: string
  payout_methods: {
    display_name: string
    description: string
  }
  users: {
    email: string
  }
}

interface CashoutStats {
  totalPending: number
  totalApproved: number
  totalProcessing: number
  totalCompleted: number
  totalRejected: number
  totalAmount: number
}

export default function CashoutManagementPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([])
  const [stats, setStats] = useState<CashoutStats>({
    totalPending: 0,
    totalApproved: 0,
    totalProcessing: 0,
    totalCompleted: 0,
    totalRejected: 0,
    totalAmount: 0
  })
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [updatingRequest, setUpdatingRequest] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadPayoutRequests()
    }
  }, [user, selectedStatus])

  const loadPayoutRequests = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Get the operator's company ID
      console.log('Loading payout requests for user:', user.id)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id, role')
        .eq('id', user.id)
        .single()

      if (userError) {
        console.error('Error fetching user data:', userError)
        throw userError
      }

      console.log('User data:', { company_id: userData.company_id, role: userData.role })

      // Check if user is an operator
      if (userData.role !== 'operator') {
        throw new Error('Only operators can access cashout management')
      }

      // Build query based on status filter
      let query = supabase
        .from('payout_requests')
        .select(`
          *,
          payout_methods (
            display_name,
            description
          ),
          users (
            email
          )
        `)
        .eq('company_id', userData.company_id)
        .order('created_at', { ascending: false })

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus)
      }

      console.log('Querying payout requests for company:', userData.company_id)
      
      // First, let's test a simple query to see if the table exists
      const { data: testData, error: testError } = await supabase
        .from('payout_requests')
        .select('id')
        .limit(1)
      
      console.log('Test query result:', { testData, testError })
      
      const { data: requests, error: requestsError } = await query

      console.log('Query result:', { requests, requestsError })

      if (requestsError) {
        console.error('Error fetching payout requests:', requestsError)
        throw requestsError
      }

      console.log('Payout requests found:', requests?.length || 0)

      setPayoutRequests(requests || [])

      // Calculate stats
      const allRequests = requests || []
      const stats: CashoutStats = {
        totalPending: allRequests.filter(r => r.status === 'pending').length,
        totalApproved: allRequests.filter(r => r.status === 'approved').length,
        totalProcessing: allRequests.filter(r => r.status === 'processing').length,
        totalCompleted: allRequests.filter(r => r.status === 'completed').length,
        totalRejected: allRequests.filter(r => r.status === 'rejected').length,
        totalAmount: allRequests.reduce((sum, r) => sum + r.amount, 0)
      }

      setStats(stats)

    } catch (error) {
      console.error('Error loading payout requests:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      })
      showToast('Failed to load payout requests', 'error')
    } finally {
      setLoading(false)
    }
  }

  const updateRequestStatus = async (requestId: string, newStatus: string, notes?: string) => {
    if (!user) return

    try {
      setUpdatingRequest(requestId)

      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      if (newStatus === 'completed' || newStatus === 'processing') {
        updateData.processed_at = new Date().toISOString()
      }

      if (notes) {
        updateData.notes = notes
      }

      const { error } = await supabase
        .from('payout_requests')
        .update(updateData)
        .eq('id', requestId)

      if (error) throw error

      showToast(`Request ${newStatus} successfully`, 'success')
      await loadPayoutRequests()

    } catch (error) {
      console.error('Error updating request status:', error)
      showToast('Failed to update request status', 'error')
    } finally {
      setUpdatingRequest(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'processing': return 'bg-purple-100 text-purple-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'approved': return '✅'
      case 'processing': return '🔄'
      case 'completed': return '🎉'
      case 'rejected': return '❌'
      default: return '📋'
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
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
        <h1 className="text-3xl font-bold text-gray-900">Cashout Management</h1>
        <p className="text-gray-600 mt-2">Manage customer payout requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Pending</p>
            <p className="text-2xl font-semibold text-yellow-600">{stats.totalPending}</p>
            <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Approved</p>
            <p className="text-2xl font-semibold text-blue-600">{stats.totalApproved}</p>
            <p className="text-xs text-gray-500 mt-1">Ready to process</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Processing</p>
            <p className="text-2xl font-semibold text-purple-600">{stats.totalProcessing}</p>
            <p className="text-xs text-gray-500 mt-1">In progress</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Completed</p>
            <p className="text-2xl font-semibold text-green-600">{stats.totalCompleted}</p>
            <p className="text-xs text-gray-500 mt-1">Paid out</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Total Amount</p>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
            <p className="text-xs text-gray-500 mt-1">All requests</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Payout Requests */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Payout Requests</h2>
        </div>
        
        {payoutRequests.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <p className="text-gray-500">No payout requests found</p>
            <p className="text-sm text-gray-400 mt-2">When customers request cashouts, they will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {payoutRequests.map((request) => (
              <div key={request.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getStatusIcon(request.status)}</span>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {request.users.email}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {request.payout_methods.display_name} • {formatDate(request.requested_at)}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Requested Amount</p>
                    <p className="font-medium text-gray-900">{formatCurrency(request.amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Processing Fee</p>
                    <p className="font-medium text-gray-900">{formatCurrency(request.processing_fee)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Net Amount</p>
                    <p className="font-medium text-green-600">{formatCurrency(request.net_amount)}</p>
                  </div>
                </div>

                {request.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Notes:</span> {request.notes}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  {request.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateRequestStatus(request.id, 'approved')}
                        disabled={updatingRequest === request.id}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {updatingRequest === request.id ? 'Updating...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => {
                          const notes = prompt('Enter rejection reason (optional):')
                          if (notes !== null) {
                            updateRequestStatus(request.id, 'rejected', notes)
                          }
                        }}
                        disabled={updatingRequest === request.id}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        {updatingRequest === request.id ? 'Updating...' : 'Reject'}
                      </button>
                    </>
                  )}
                  
                  {request.status === 'approved' && (
                    <button
                      onClick={() => updateRequestStatus(request.id, 'processing')}
                      disabled={updatingRequest === request.id}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                    >
                      {updatingRequest === request.id ? 'Updating...' : 'Mark as Processing'}
                    </button>
                  )}
                  
                  {request.status === 'processing' && (
                    <button
                      onClick={() => updateRequestStatus(request.id, 'completed')}
                      disabled={updatingRequest === request.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {updatingRequest === request.id ? 'Updating...' : 'Mark as Completed'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 