'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSearchParams } from 'next/navigation'

type TimePeriod = 'today' | 'yesterday' | 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'custom'

interface TimeRange {
  start: Date
  end: Date
}

interface ReferralTransaction {
  TransactionID: number
  ProductName: string
  AuthorizationDateTimeGMT: string
  SettlementValue: number
  PaymentMethod: string
  operating_company: string
  base_price: number
  commission_percent: number
  commission_amount: number
  product_name: string
  mappedProductName: string
  machine_name: string
  time: string
  transaction_status: string
  quantity: number
}

interface ReferralMachine {
  id: string
  displayName: string
  businessName: string
  placementArea: string
  companyName: string
}

export default function ReferralSalesPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [transactions, setTransactions] = useState<ReferralTransaction[]>([])
  const [machines, setMachines] = useState<ReferralMachine[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMachine, setSelectedMachine] = useState<string>('all')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today')
  const [customDateRange, setCustomDateRange] = useState<TimeRange>({
    start: new Date(),
    end: new Date()
  })

  // Get machine ID from URL params if present
  const machineIdFromUrl = searchParams.get('machine')

  useEffect(() => {
    if (machineIdFromUrl) {
      setSelectedMachine(machineIdFromUrl)
    }
  }, [machineIdFromUrl])

  useEffect(() => {
    if (user) {
      loadReferralSalesData()
    }
  }, [user, selectedMachine, timePeriod, customDateRange])

  const loadReferralSalesData = async () => {
    if (!user) return

    setLoading(true)
    try {
      const timeRange = getTimeRange(timePeriod)
      const startDate = timeRange.start.toISOString()
      const endDate = timeRange.end.toISOString()
      
      const response = await fetch('/api/customer-referral-sales-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          startDate,
          endDate,
          machineId: selectedMachine,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch referral sales data')
      }

      const data = await response.json()
      setTransactions(data.transactions || [])
      
      // Extract unique machines from transactions
      const uniqueMachines = new Map<string, ReferralMachine>()
      data.transactions?.forEach((transaction: ReferralTransaction) => {
        const machineKey = transaction.machine_name
        if (!uniqueMachines.has(machineKey)) {
          uniqueMachines.set(machineKey, {
            id: machineKey, // Using machine name as ID for now
            displayName: transaction.machine_name,
            businessName: transaction.machine_name.split(' - ')[0] || '',
            placementArea: transaction.machine_name.split(' - ')[1] || '',
            companyName: transaction.operating_company
          })
        }
      })
      setMachines(Array.from(uniqueMachines.values()))
      
    } catch (error) {
      console.error('Error loading referral sales data:', error)
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

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatPercent = (percent: number) => {
    return `${percent.toFixed(2)}%`
  }

  // Calculate summary statistics
  const totalSales = transactions.reduce((sum, t) => sum + (t.SettlementValue || 0), 0)
  const totalCommission = transactions.reduce((sum, t) => sum + (t.commission_amount || 0), 0)
  const totalTransactions = transactions.length
  const completedTransactions = transactions.filter(t => t.transaction_status === 'Completed').length
  const totalProductsSold = transactions.filter(t => t.transaction_status === 'Completed').reduce((sum, t) => sum + (t.quantity || 1), 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Referral Sales</h1>
          <button
            onClick={loadReferralSalesData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Data
          </button>
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
                onChange={(e) => setSelectedMachine(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Machines</option>
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.displayName}
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
                onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
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
          </div>

          {/* Selected Time Range Display */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Showing data from <span className="font-medium">{formatDate(getTimeRange(timePeriod).start)}</span> to{' '}
              <span className="font-medium">{formatDate(getTimeRange(timePeriod).end)}</span>
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={loadReferralSalesData}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Refresh Data'}
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{totalTransactions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{completedTransactions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Products Sold</p>
                <p className="text-2xl font-bold text-gray-900">{totalProductsSold}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Commission</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCommission)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Referral Transactions</h3>
          </div>
          
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading referral sales data...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-600">No referral transactions found for the selected criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operating Company
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
                      Base Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commission %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commission Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction, index) => (
                    <tr key={`${transaction.TransactionID || index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.operating_company}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.machine_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.mappedProductName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(transaction.base_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPercent(transaction.commission_percent)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(transaction.commission_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.transaction_status === 'Completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.transaction_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 