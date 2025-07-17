'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import CustomerMachineCard from '@/components/customers/CustomerMachineCard'
import { CustomerMachine } from '@/types'

export default function CustomerMachinesPage() {
  const { user, loading: authLoading } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()
  
  const [machines, setMachines] = useState<CustomerMachine[]>([])
  const [referralMachines, setReferralMachines] = useState<CustomerMachine[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'referrals'>('pending')

  // Redirect if not authenticated or not a customer
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'customer')) {
      router.push('/customers/login')
    }
  }, [user, authLoading, router])

  // Load customer machines
  const loadCustomerMachines = async () => {
    if (!user) {
      console.log('No user found, skipping machine load')
      return
    }

    try {
      setLoading(true)
      console.log('Loading machines for customer:', user.id)
      console.log('User role:', user.role)
      console.log('Full user object:', user)

      // Test 1: Simple query without joins
      console.log('Test 1: Simple query without joins')
      const { data: simpleData, error: simpleError } = await supabase
        .from('customer_machines')
        .select('id, customer_id, machine_name')
        .eq('customer_id', user.id)
        .limit(5)

      console.log('Simple query result:', { 
        data: simpleData ? `Found ${simpleData.length} machines` : 'No data',
        error: simpleError ? {
          message: simpleError.message,
          details: simpleError.details,
          hint: simpleError.hint,
          code: simpleError.code
        } : 'No error'
      })

      if (simpleError) {
        console.error('Simple query failed:', simpleError)
        throw new Error(`Database access failed: ${simpleError.message}`)
      }

      // Test 2: Query with companies join
      console.log('Test 2: Query with companies join')
      const { data, error } = await supabase
        .from('customer_machines')
        .select(`
          id,
          customer_id,
          company_id,
          machine_name,
          approval_status,
          onboarding_status,
          created_at,
          host_business_name,
          host_address,
          point_of_contact_name,
          point_of_contact_position,
          machine_placement_area,
          slot_count,
          slot_configuration,
          companies!inner(
            id,
            name,
            logo_url
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })

      console.log('Full query result:', { 
        data: data ? `Found ${data.length} machines` : 'No data',
        error: error ? {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        } : 'No error'
      })

      if (error) {
        console.error('Full query failed:', error)
        throw error
      }

      // Transform the data to match CustomerMachine interface with error handling
      const transformedData = (data || []).map((machine: any) => {
        try {
          return {
            ...machine,
            company: machine.companies ? {
              id: machine.companies.id,
              name: machine.companies.name,
              logo_url: machine.companies.logo_url
            } : undefined
          }
        } catch (error) {
          console.error('Error transforming machine data:', error, machine)
          // Return a safe fallback
          return {
            ...machine,
            company: undefined,
            machine_name: machine.machine_name || `Machine #${machine.id?.slice(0, 8) || 'Unknown'}`,
            approval_status: machine.approval_status || 'unknown',
            onboarding_status: machine.onboarding_status || 'in_progress'
          }
        }
      })

      console.log('Customer machines loaded successfully:', transformedData)
      setMachines(transformedData)
    } catch (error: any) {
      console.error('Error loading machines:', {
        error,
        message: error?.message,
        details: error?.details,
        stack: error?.stack,
        type: typeof error,
        constructor: error?.constructor?.name
      })
      
      // Show a more specific error message
      let errorMessage = 'Unknown error occurred'
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.details) {
        errorMessage = error.details
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      showToast(`Error loading your machines: ${errorMessage}`, 'error')
      setMachines([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  // Load referral machines
  const loadReferralMachines = async () => {
    if (!user) {
      console.log('No user found, skipping referral machine load')
      return
    }

    try {
      console.log('Loading referral machines for user:', user.id)

      // First, let's check ALL machines in the database
      const { data: allMachines, error: allMachinesError } = await supabase
        .from('customer_machines')
        .select('id, referral_user_id, customer_id, machine_name, approval_status')
        .limit(10)

      console.log('ALL machines in database:', allMachines)
      console.log('All machines error:', allMachinesError)

      // Check machines with any referral_user_id (not null)
      const { data: machinesWithReferral, error: referralError } = await supabase
        .from('customer_machines')
        .select('id, referral_user_id, customer_id, machine_name')
        .not('referral_user_id', 'is', null)

      console.log('Machines with ANY referral_user_id:', machinesWithReferral)
      console.log('Referral error:', referralError)

      // Check machines for this specific customer
      const { data: customerMachines, error: customerError } = await supabase
        .from('customer_machines')
        .select('id, referral_user_id, customer_id, machine_name')
        .eq('customer_id', user.id)

      console.log('Machines for this customer:', customerMachines)
      console.log('Customer error:', customerError)

      // Check if this user ID exists in the users table
      const { data: userExists, error: userCheckError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', user.id)
        .single()

      console.log('User exists in users table:', userExists)
      console.log('User check error:', userCheckError)

      // First, let's check if there are any machines with referral_user_id set
      const { data: allReferralMachines, error: checkError } = await supabase
        .from('customer_machines')
        .select('id, referral_user_id, customer_id, machine_name')
        .not('referral_user_id', 'is', null)

      console.log('All machines with referral_user_id:', allReferralMachines)
      console.log('Check error:', checkError)
      console.log('Current user ID:', user.id)
      console.log('Looking for machines where referral_user_id =', user.id)

      // Check if any of these machines match our user ID
      const matchingMachines = allReferralMachines?.filter(machine => machine.referral_user_id === user.id) || []
      console.log('Machines that should match our user ID:', matchingMachines)
      
      // Debug data types
      console.log('Data type debugging:')
      console.log('User ID type:', typeof user.id, 'Value:', user.id)
      if (allReferralMachines && allReferralMachines.length > 0) {
        console.log('First machine referral_user_id type:', typeof allReferralMachines[0].referral_user_id, 'Value:', allReferralMachines[0].referral_user_id)
        console.log('Are they equal?', user.id === allReferralMachines[0].referral_user_id)
        console.log('Are they strictly equal?', user.id === allReferralMachines[0].referral_user_id)
        console.log('String comparison:', String(user.id) === String(allReferralMachines[0].referral_user_id))
      }

      // Now query for this specific user's referrals
      const { data, error } = await supabase
        .from('customer_machines')
        .select(`
          id,
          customer_id,
          company_id,
          machine_name,
          approval_status,
          onboarding_status,
          created_at,
          host_business_name,
          host_address,
          point_of_contact_name,
          point_of_contact_position,
          machine_placement_area,
          slot_count,
          slot_configuration,
          referral_user_id,
          referral_commission_percent,
          companies!inner(
            id,
            name,
            logo_url
          )
        `)
        .eq('referral_user_id', user.id)
        .order('created_at', { ascending: false })

      console.log('Referral query result:', { 
        data: data ? `Found ${data.length} referral machines` : 'No data',
        error: error ? {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        } : 'No error',
        user_id: user.id
      })

      if (error) {
        console.error('Error loading referral machines:', error)
        throw error
      }

      // Transform the data to match CustomerMachine interface
      const transformedData = (data || []).map((machine: any) => ({
        ...machine,
        company: machine.companies ? {
          id: machine.companies.id,
          name: machine.companies.name,
          logo_url: machine.companies.logo_url
        } : undefined
      }))

      console.log('Referral machines loaded successfully:', transformedData)
      setReferralMachines(transformedData)
    } catch (error: any) {
      console.error('Error loading referral machines:', error)
      showToast(`Error loading your referral machines: ${error.message}`, 'error')
      setReferralMachines([])
    }
  }

  // Load machines when user is available
  useEffect(() => {
    if (user && user.role === 'customer') {
      loadCustomerMachines()
      loadReferralMachines()
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

  const rejectedMachines = machines.filter(machine => 
    machine.approval_status === 'rejected' || 
    machine.approval_status === 'abandoned'
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            <button
              onClick={() => setActiveTab('rejected')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rejected'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Rejected ({rejectedMachines.length})
            </button>
            <button
              onClick={() => setActiveTab('referrals')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'referrals'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Referrals ({referralMachines.length})
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
          {activeTab === 'pending' && (
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
                    <div key={machine.id}>
                      {(() => {
                        try {
                          return (
                            <CustomerMachineCard
                              machine={machine}
                              onUpdate={loadCustomerMachines}
                            />
                          )
                        } catch (error) {
                          console.error('Error rendering machine card:', error, machine)
                          return (
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                              <div className="text-center">
                                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                </div>
                                <h3 className="text-sm font-medium text-gray-900 mb-2">Error Loading Machine</h3>
                                <p className="text-sm text-gray-500 mb-4">
                                  There was an error displaying this machine.
                                </p>
                                <button
                                  onClick={loadCustomerMachines}
                                  className="text-sm text-blue-600 hover:text-blue-500"
                                >
                                  Try Again
                                </button>
                              </div>
                            </div>
                          )
                        }
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'approved' && (
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
                    <div key={machine.id}>
                      {(() => {
                        try {
                          return (
                            <CustomerMachineCard
                              machine={machine}
                              onUpdate={loadCustomerMachines}
                            />
                          )
                        } catch (error) {
                          console.error('Error rendering machine card:', error, machine)
                          return (
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                              <div className="text-center">
                                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                </div>
                                <h3 className="text-sm font-medium text-gray-900 mb-2">Error Loading Machine</h3>
                                <p className="mt-1 text-sm text-gray-500 mb-4">
                                  There was an error displaying this machine.
                                </p>
                                <button
                                  onClick={loadCustomerMachines}
                                  className="text-sm text-blue-600 hover:text-blue-500"
                                >
                                  Try Again
                                </button>
                              </div>
                            </div>
                          )
                        }
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'rejected' && (
            <div>
              {rejectedMachines.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No rejected machines</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You don't have any rejected or cancelled machines.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                  {rejectedMachines.map((machine) => (
                    <div key={machine.id}>
                      {(() => {
                        try {
                          return (
                            <CustomerMachineCard
                              machine={machine}
                              onUpdate={loadCustomerMachines}
                            />
                          )
                        } catch (error) {
                          console.error('Error rendering machine card:', error, machine)
                          return (
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                              <div className="text-center">
                                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                </div>
                                <h3 className="text-sm font-medium text-gray-900 mb-2">Error Loading Machine</h3>
                                <p className="mt-1 text-sm text-gray-500 mb-4">
                                  There was an error displaying this machine.
                                </p>
                                <button
                                  onClick={loadCustomerMachines}
                                  className="text-sm text-blue-600 hover:text-blue-500"
                                >
                                  Try Again
                                </button>
                              </div>
                            </div>
                          )
                        }
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'referrals' && (
            <div>
              {/* Debug Information */}
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Debug Information
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p><strong>Current User ID:</strong> {user?.id}</p>
                      <p><strong>Total Machines:</strong> {machines.length}</p>
                      <p><strong>Referral Machines Found:</strong> {referralMachines.length}</p>
                      <p><strong>Expected Referral User ID:</strong> f3eb4b79-44ba-4255-baf2-b4cc9d611a11</p>
                      <p><strong>User IDs Match:</strong> {user?.id === 'f3eb4b79-44ba-4255-baf2-b4cc9d611a11' ? 'YES' : 'NO'}</p>
                      <p><strong>Check console for detailed debugging info</strong></p>
                    </div>
                  </div>
                </div>
              </div>

              {referralMachines.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No referral machines</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You haven't referred any machines yet. When operators approve machines with your referral ID, they'll appear here.
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
                <div>
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">
                          Referral Commission Information
                        </h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>These are machines that operators have approved with your referral ID. You may be eligible for commission on these machines.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid gap-6 lg:grid-cols-2">
                    {referralMachines.map((machine) => (
                      <div key={machine.id}>
                        {(() => {
                          try {
                            return (
                              <CustomerMachineCard
                                machine={machine}
                                onUpdate={() => {
                                  loadCustomerMachines()
                                  loadReferralMachines()
                                }}
                              />
                            )
                          } catch (error) {
                            console.error('Error rendering referral machine card:', error, machine)
                            return (
                              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                                <div className="text-center">
                                  <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                  </div>
                                  <h3 className="text-sm font-medium text-gray-900 mb-2">Error Loading Machine</h3>
                                  <p className="text-sm text-gray-500 mb-4">
                                    There was an error displaying this machine.
                                  </p>
                                  <button
                                    onClick={() => {
                                      loadCustomerMachines()
                                      loadReferralMachines()
                                    }}
                                    className="text-sm text-blue-600 hover:text-blue-500"
                                  >
                                    Try Again
                                  </button>
                                </div>
                              </div>
                            )
                          }
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
} 