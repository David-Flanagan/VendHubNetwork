'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'

interface PayoutRequest {
  id: string
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
  companies: {
    name: string
    logo_url?: string
  }
}

interface CashoutStats {
  totalRequests: number
  totalCompleted: number
  totalPending: number
  totalAmount: number
  totalReceived: number
}

export default function CashoutHistoryPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([])
  const [stats, setStats] = useState<CashoutStats>({
    totalRequests: 0,
    totalCompleted: 0,
    totalPending: 0,
    totalAmount: 0,
    totalReceived: 0
  })
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  useEffect(() => {
    if (user) {
      loadPayoutRequests()
    }
  }, [user, selectedStatus])

  const loadPayoutRequests = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Build query based on status filter
      if (!supabase) {
        throw new Error('Supabase not configured')
      }
      
      let query = supabase
        .from('payout_requests')
        .select(`
          *,
          payout_methods (
            display_name,
            description
          ),
          companies (
            name,
            logo_url
          )
        `)
        .eq('customer_id', user.id)
        .order('requested_at', { ascending: false })

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus)
      }

      const { data: requests, error: requestsError } = await query

      if (requestsError) throw requestsError

      setPayoutRequests(requests || [])

      // Calculate stats
      const allRequests = requests || []
      const stats: CashoutStats = {
        totalRequests: allRequests.length,
        totalCompleted: allRequests.filter(r => r.status === 'completed').length,
        totalPending: allRequests.filter(r => ['pending', 'approved', 'processing'].includes(r.status)).length,
        totalAmount: allRequests.reduce((sum, r) => sum + r.amount, 0),
        totalReceived: allRequests.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.net_amount, 0)
      }

      setStats(stats)

    } catch (error) {
      console.error('Error loading payout requests:', error)
      showToast('Failed to load cashout history', 'error')
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

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'pending': return 'Your request is being reviewed by the operator'
      case 'approved': return 'Your request has been approved and is ready for processing'
      case 'processing': return 'Your payout is being processed by the operator'
      case 'completed': return 'Your payout has been completed and sent'
      case 'rejected': return 'Your request was rejected by the operator'
      default: return 'Unknown status'
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
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
        <h1 className="text-3xl font-bold text-gray-900">Cashout History</h1>
        <p className="text-gray-600 mt-2">Track your payout requests and status</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Total Requests</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.totalRequests}</p>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Pending</p>
            <p className="text-2xl font-semibold text-yellow-600">{stats.totalPending}</p>
            <p className="text-xs text-gray-500 mt-1">Awaiting completion</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Completed</p>
            <p className="text-2xl font-semibold text-green-600">{stats.totalCompleted}</p>
            <p className="text-xs text-gray-500 mt-1">Successfully paid</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Total Received</p>
            <p className="text-2xl font-semibold text-green-600">{formatCurrency(stats.totalReceived)}</p>
            <p className="text-xs text-gray-500 mt-1">Net amount received</p>
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
          <h2 className="text-lg font-semibold text-gray-900">Your Cashout Requests</h2>
        </div>
        
        {payoutRequests.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <p className="text-gray-500">No cashout requests found</p>
            <p className="text-sm text-gray-400 mt-2">Your cashout requests will appear here</p>
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
                        {request.companies.name}
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
                    <p className="text-sm text-gray-500">You'll Receive</p>
                    <p className="font-medium text-green-600">{formatCurrency(request.net_amount)}</p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Status:</span> {getStatusDescription(request.status)}
                  </p>
                  {request.processed_at && (
                    <p className="text-sm text-blue-700 mt-1">
                      Processed on: {formatDate(request.processed_at)}
                    </p>
                  )}
                  {request.notes && (
                    <p className="text-sm text-blue-700 mt-1">
                      <span className="font-medium">Note:</span> {request.notes}
                    </p>
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