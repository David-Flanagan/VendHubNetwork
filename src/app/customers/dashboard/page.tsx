'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import CustomerMachineCard from '@/components/customers/CustomerMachineCard'
import { CustomerMachine } from '@/types'

export default function CustomerDashboard() {
  const { user, loading: authLoading } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()
  
  const [machines, setMachines] = useState<CustomerMachine[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending')

  // Redirect if not authenticated or not a customer
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'customer')) {
      router.push('/customers/login')
    }
  }, [user, authLoading, router])

  // Load customer machines
  const loadCustomerMachines = async () => {
    if (!user) return

    try {
      setLoading(true)
      console.log('Loading machines for customer:', user.id)

      const { data, error } = await supabase
        .from('customer_machines')
        .select(`
          *,
          company:companies(
            id,
            name,
            logo_url
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading customer machines:', error)
        throw error
      }

      console.log('Customer machines loaded:', data)
      setMachines(data || [])
    } catch (error) {
      console.error('Error loading machines:', error)
      showToast('Error loading your machines', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load machines when user is available
  useEffect(() => {
    if (user && user.role === 'customer') {
      loadCustomerMachines()
    }
  }, [user])

        // Filter machines based on active tab
      const pendingMachines = machines.filter(machine => 
        machine.approval_status === 'pending' || 
        machine.onboarding_status === 'in_progress'
      )
      
      const approvedMachines = machines.filter(machine => 
        machine.approval_status === 'approved'
      )

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'customer') {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Machines</h1>
          <p className="mt-2 text-gray-600">
            Track your vending machine onboarding and manage your active machines
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pending'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending ({pendingMachines.length})
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'approved'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Active ({approvedMachines.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your machines...</p>
          </div>
        ) : (
          <div>
            {activeTab === 'pending' ? (
              <div>
                {pendingMachines.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto h-12 w-12 text-gray-400">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No pending machines</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      You don't have any machines in the onboarding process.
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={() => router.push('/browse-operators')}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Browse Operators
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6 lg:grid-cols-2">
                    {pendingMachines.map((machine) => (
                      <CustomerMachineCard
                        key={machine.id}
                        machine={machine}
                        onUpdate={loadCustomerMachines}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {approvedMachines.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto h-12 w-12 text-gray-400">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No active machines</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      You don't have any approved machines yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-6 lg:grid-cols-2">
                    {approvedMachines.map((machine) => (
                      <CustomerMachineCard
                        key={machine.id}
                        machine={machine}
                        onUpdate={loadCustomerMachines}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 