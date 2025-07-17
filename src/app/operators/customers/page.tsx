'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import RouteGuard from '@/components/auth/RouteGuard'

interface CustomerMachine {
  id: string
  customer_id: string
  company_id: string
  host_business_name: string
  machine_placement_area: string
  host_address: string
  point_of_contact_name: string
  point_of_contact_position: string
  point_of_contact_email: string
  point_of_contact_phone: string
  default_commission_rate: number
  approval_status: 'pending' | 'approved' | 'rejected'
  nayax_machine_id: string | null
  referral_user_id: string | null
  referral_commission_percent: number | null
  approved_at: string | null
  approved_by: string | null
  rejection_reason: string | null
  created_at: string
  customer: {
    business_name: string
    business_type: string
  }
  products: CustomerMachineProduct[]
}

interface CustomerMachineProduct {
  id: string
  row_number: number
  slot_number: number
  product_type_name: string
  product_name: string
  brand_name: string
  base_price: number
  commission_rate: number
  commission_amount: number
  final_price: number
  image_url?: string
}

export default function OperatorCustomersPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [customerMachines, setCustomerMachines] = useState<CustomerMachine[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<{
    [key: string]: { nayaxMachineId: string; referralUserId: string; referralCommissionPercent: string }
  }>({})
  const [showSlotModal, setShowSlotModal] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<CustomerMachine | null>(null)

  useEffect(() => {
    if (user?.company_id) {
      loadCustomerMachines()
    }
  }, [user])

  const loadCustomerMachines = async () => {
    try {
      setLoading(true)
      
      // Debug: Log operator user info
      console.log('Operator user:', user)
      console.log('Operator company_id:', user?.company_id)
      
      // Fetch customer machines WITHOUT join to customers
      const { data: machines, error: machinesError } = await supabase
        .from('customer_machines')
        .select('*')
        .eq('company_id', user?.company_id)
        .order('created_at', { ascending: false })

      if (machinesError) {
        console.error('Error loading customer machines:', machinesError)
        showToast('Failed to load customer machines', 'error')
        return
      }

      console.log('Found machines:', machines?.length || 0)
      console.log('Machine data:', machines)

      // Fetch products for each machine
      const machinesWithProducts = await Promise.all(
        (machines || []).map(async (machine) => {
          console.log('Processing machine:', machine.id, 'company_id:', machine.company_id)
          
          // Fetch customer info for this machine
          let customerInfo = null
          if (machine.customer_id) {
            const { data: customers, error: customerError } = await supabase
              .from('customers')
              .select('business_name, business_type')
              .eq('user_id', machine.customer_id)
              .limit(1)
              .maybeSingle()
            if (customerError) {
              console.error('Error loading customer info:', customerError)
            }
            customerInfo = customers
          }

          // Parse slot configuration from JSON instead of querying customer_machine_products table
          console.log('Parsing slot configuration for machine:', machine.id)
          let formattedProducts = []
          
          try {
            const slotConfig = machine.slot_configuration
            if (slotConfig && typeof slotConfig === 'object' && slotConfig.rows) {
              // Flatten the rows into individual products
              formattedProducts = slotConfig.rows.flatMap((row: any, rowIndex: number) => 
                (row.slots || []).map((slot: any, slotIndex: number) => ({
                  id: `${machine.id}-row${row.row_number || rowIndex + 1}-slot${slot.slot_number || slotIndex + 1}`,
                  row_number: row.row_number || rowIndex + 1,
                  slot_number: slot.slot_number || slotIndex + 1,
                  product_type_name: slot.product_type_name || 'Unknown',
                  product_name: slot.product_name || `${slot.product_type_name || 'Unknown'} (Row ${row.row_number || rowIndex + 1}, Slot ${slot.slot_number || slotIndex + 1})`,
                  brand_name: slot.brand_name || 'Unknown',
                  base_price: slot.base_price || 0,
                  commission_rate: slot.commission_rate || 0,
                  commission_amount: slot.commission_amount || 0,
                  final_price: slot.final_price || 0,
                  image_url: slot.image_url || null
                }))
              )
            }
            console.log('Parsed products from slot configuration:', formattedProducts)
          } catch (error) {
            console.error('Error parsing slot configuration:', error)
            formattedProducts = []
          }

          return {
            ...machine,
            customer: customerInfo,
            products: formattedProducts
          }
        })
      )

      setCustomerMachines(machinesWithProducts)
    } catch (error) {
      console.error('Error loading customer machines:', error)
      showToast('Failed to load customer machines', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (machineId: string) => {
    const machineData = formData[machineId]
    if (!machineData?.nayaxMachineId?.trim()) {
      showToast('Nayax Machine ID is required', 'error')
      return
    }

    try {
      setApprovingId(machineId)
      
      console.log('Approving machine:', machineId)
      console.log('Machine data:', machineData)
      console.log('User ID:', user?.id)
      
      const updateData = {
        approval_status: 'approved',
        nayax_machine_id: machineData.nayaxMachineId.trim(),
        referral_user_id: machineData.referralUserId?.trim() || null,
        referral_commission_percent: machineData.referralCommissionPercent ? parseFloat(machineData.referralCommissionPercent) : null,
        approved_at: new Date().toISOString(),
        approved_by: user?.id
      }
      
      console.log('Update data:', updateData)
      
      const { data, error } = await supabase
        .from('customer_machines')
        .update(updateData)
        .eq('id', machineId)
        .select()

      console.log('Supabase response:', { data, error })

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      console.log('Machine approved successfully:', data)
      showToast('Machine request approved successfully', 'success')
      loadCustomerMachines()
      
      // Clear form data for this machine
      setFormData(prev => {
        const newData = { ...prev }
        delete newData[machineId]
        return newData
      })
    } catch (error: any) {
      console.error('Error approving machine:', error)
      console.error('Error message:', error.message)
      console.error('Error details:', error.details)
      console.error('Error hint:', error.hint)
      showToast(`Failed to approve machine request: ${error.message || 'Unknown error'}`, 'error')
    } finally {
      setApprovingId(null)
    }
  }

  const handleReject = async (machineId: string) => {
    try {
      setRejectingId(machineId)
      
      console.log('Rejecting machine:', machineId)
      
      const updateData = {
        approval_status: 'rejected',
        rejection_reason: 'Rejected by operator'
      }
      
      console.log('Update data:', updateData)
      
      const { data, error } = await supabase
        .from('customer_machines')
        .update(updateData)
        .eq('id', machineId)
        .select()

      console.log('Supabase response:', { data, error })

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      console.log('Machine rejected successfully:', data)
      showToast('Machine request rejected', 'success')
      loadCustomerMachines()
    } catch (error: any) {
      console.error('Error rejecting machine:', error)
      console.error('Error message:', error.message)
      console.error('Error details:', error.details)
      console.error('Error hint:', error.hint)
      showToast(`Failed to reject machine request: ${error.message || 'Unknown error'}`, 'error')
    } finally {
      setRejectingId(null)
    }
  }

  const updateFormData = (machineId: string, field: 'nayaxMachineId' | 'referralUserId' | 'referralCommissionPercent', value: string) => {
    setFormData(prev => ({
      ...prev,
      [machineId]: {
        ...prev[machineId],
        [field]: value
      }
    }))
  }

  const handleViewSlotConfiguration = (machine: CustomerMachine) => {
    setSelectedMachine(machine)
    setShowSlotModal(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">Pending Review</span>
      case 'approved':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">Approved</span>
      case 'rejected':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">Rejected</span>
      default:
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200">Unknown</span>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      case 'approved':
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )
      case 'rejected':
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customer requests...</p>
        </div>
      </div>
    )
  }

  return (
    <RouteGuard requiredRole="operator">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Customer Machine Requests</h1>
                <p className="text-gray-600 mt-2">Review and approve customer machine requests</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  {customerMachines.filter(m => m.approval_status === 'pending').length} pending
                </div>
                <div className="text-sm text-gray-500">
                  {customerMachines.filter(m => m.approval_status === 'approved').length} approved
                </div>
                <div className="text-sm text-gray-500">
                  {customerMachines.filter(m => m.approval_status === 'rejected').length} rejected
                </div>
              </div>
            </div>
          </div>

          {customerMachines.length === 0 ? (
            <div className="bg-white p-12 rounded-xl shadow-sm border text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">No Requests Found</h3>
              <p className="text-gray-500 max-w-md mx-auto">There are no customer machine requests at this time. New requests will appear here when customers submit them.</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {customerMachines.map((machine) => (
                <div key={machine.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                  {/* Card Header with Gradient */}
                  <div className={`px-6 py-5 ${machine.approval_status === 'pending' ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200' : machine.approval_status === 'approved' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200' : 'bg-gradient-to-r from-red-50 to-pink-50 border-b border-red-200'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${machine.approval_status === 'pending' ? 'bg-yellow-100' : machine.approval_status === 'approved' ? 'bg-green-100' : 'bg-red-100'}`}>
                          {machine.approval_status === 'pending' ? (
                            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : machine.approval_status === 'approved' ? (
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                            {machine.host_business_name || 'Unknown Business'} - {machine.machine_placement_area || 'Unknown Area'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {machine.customer?.business_type}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="font-medium">{machine.point_of_contact_name}</span>
                            <span className="text-gray-400">•</span>
                                                          <span>{new Date(machine.created_at).toLocaleDateString('en-US', {
                                month: '2-digit',
                                day: '2-digit',
                                year: 'numeric'
                              })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(machine.approval_status)}
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6">

                    {/* Location Info */}
                    <div className="mb-6">
                      <div className="flex items-center mb-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <h4 className="text-sm font-semibold text-gray-700">Location</h4>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center">
                            <span className="font-medium text-gray-700 w-16">Business:</span>
                            <span className="text-gray-600">{machine.host_business_name}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-medium text-gray-700 w-16">Area:</span>
                            <span className="text-gray-600">{machine.machine_placement_area}</span>
                          </div>
                          <div className="flex items-start">
                            <span className="font-medium text-gray-700 w-16">Address:</span>
                            <span className="text-gray-600">{machine.host_address}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="mb-6">
                      <div className="flex items-center mb-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <h4 className="text-sm font-semibold text-gray-700">Contact</h4>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center">
                            <span className="font-medium text-gray-700 w-16">Name:</span>
                            <span className="text-gray-600">{machine.point_of_contact_name}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-medium text-gray-700 w-16">Position:</span>
                            <span className="text-gray-600">{machine.point_of_contact_position}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-medium text-gray-700 w-16">Email:</span>
                            <span className="text-gray-600">{machine.point_of_contact_email}</span>
                          </div>
                          {machine.point_of_contact_phone && (
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700 w-16">Phone:</span>
                              <span className="text-gray-600">{machine.point_of_contact_phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Slot Configuration Button */}
                    <div className="mb-6">
                      <button
                        onClick={() => handleViewSlotConfiguration(machine)}
                        className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        View Slot Configuration
                      </button>
                    </div>

                    {/* Approval Form - Only show for pending requests */}
                    {machine.approval_status === 'pending' && (
                      <div className="border-t border-gray-200 pt-6">
                        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Approval Information
                        </h4>
                        <div className="grid md:grid-cols-3 gap-4 mb-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Nayax Machine ID <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={formData[machine.id]?.nayaxMachineId || ''}
                              onChange={(e) => updateFormData(machine.id, 'nayaxMachineId', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="Enter Nayax Machine ID"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Referral User ID <span className="text-gray-400">(Optional)</span>
                            </label>
                            <input
                              type="text"
                              value={formData[machine.id]?.referralUserId || ''}
                              onChange={(e) => updateFormData(machine.id, 'referralUserId', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="Enter referral user ID"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Referral Commission % <span className="text-gray-400">(Optional)</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={formData[machine.id]?.referralCommissionPercent || ''}
                              onChange={(e) => updateFormData(machine.id, 'referralCommissionPercent', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="e.g., 5.00"
                            />
                          </div>
                        </div>
                        <div className="flex space-x-4">
                          <button
                            onClick={() => handleApprove(machine.id)}
                            disabled={approvingId === machine.id || !formData[machine.id]?.nayaxMachineId?.trim()}
                            className="flex-1 md:flex-none px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                          >
                            {approvingId === machine.id ? (
                              <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Approving...
                              </span>
                            ) : (
                              <span className="flex items-center justify-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Approve Request
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => handleReject(machine.id)}
                            disabled={rejectingId === machine.id}
                            className="flex-1 md:flex-none px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                          >
                            {rejectingId === machine.id ? (
                              <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Rejecting...
                              </span>
                            ) : (
                              <span className="flex items-center justify-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Reject Request
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Approved/Rejected Info */}
                    {machine.approval_status === 'approved' && (
                      <div className="border-t border-gray-200 pt-6">
                        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Approval Details
                        </h4>
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-green-800"><span className="font-medium">Nayax Machine ID:</span> {machine.nayax_machine_id}</p>
                              {machine.referral_user_id && (
                                <p className="text-green-800"><span className="font-medium">Referral User ID:</span> {machine.referral_user_id}</p>
                              )}
                              {machine.referral_commission_percent && (
                                <p className="text-green-800"><span className="font-medium">Referral Commission:</span> {machine.referral_commission_percent}%</p>
                              )}
                            </div>
                            <div>
                              <p className="text-green-800"><span className="font-medium">Approved:</span> {machine.approved_at ? new Date(machine.approved_at).toLocaleDateString('en-US', {
                                month: '2-digit',
                                day: '2-digit',
                                year: 'numeric'
                              }) : 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {machine.approval_status === 'rejected' && (
                      <div className="border-t border-gray-200 pt-6">
                        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Rejection Details
                        </h4>
                        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                          <p className="text-red-800 text-sm">
                            <span className="font-medium">Reason:</span> {machine.rejection_reason || 'No reason provided'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Slot Configuration Modal */}
      {selectedMachine && showSlotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Slot Configuration - {selectedMachine.host_business_name || 'Unknown Business'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedMachine.machine_placement_area || 'Unknown Area'} • {selectedMachine.products.length} products
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowSlotModal(false)
                    setSelectedMachine(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {selectedMachine.products.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No products configured</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    This machine doesn't have any products configured yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Group products by row */}
                  {Array.from(new Set(selectedMachine.products.map(p => p.row_number))).sort().map(rowNumber => {
                    const rowProducts = selectedMachine.products.filter(p => p.row_number === rowNumber)
                    return (
                      <div key={rowNumber} className="bg-gray-50 rounded-xl p-4">
                        {/* Row Header */}
                        <div className="flex items-center mb-4">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                            <span className="text-sm font-bold text-blue-600">{rowNumber}</span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Row {rowNumber}
                          </h3>
                          <span className="ml-2 text-sm text-gray-500">
                            ({rowProducts.length} slots)
                          </span>
                        </div>

                        {/* Slots Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {rowProducts.map((product) => (
                            <div key={product.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                              {/* Slot Header */}
                              <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-700">
                                    Slot {product.slot_number}
                                  </span>
                                  <span className="text-xs text-gray-500 font-mono">
                                    R{product.row_number}S{product.slot_number}
                                  </span>
                                </div>
                              </div>

                              {/* Product Content */}
                              <div className="p-3">
                                {/* Product Image */}
                                {product.image_url && (
                                  <div className="mb-3">
                                    <img
                                      src={product.image_url}
                                      alt={product.product_name}
                                      className="w-full h-24 object-contain rounded-md bg-gray-50"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        target.style.display = 'none'
                                      }}
                                    />
                                  </div>
                                )}

                                {/* Product Info */}
                                <div className="space-y-2">
                                  <div>
                                    <h4 className="font-medium text-gray-900 text-sm truncate">
                                      {product.product_name}
                                    </h4>
                                    <p className="text-xs text-gray-500 truncate">
                                      {product.product_type_name === 'Unknown' ? product.brand_name : `${product.brand_name} • ${product.product_type_name}`}
                                    </p>
                                  </div>

                                  {/* Pricing Info */}
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-gray-500">Base Price:</span>
                                      <span className="text-sm font-medium text-gray-900">
                                        ${product.base_price.toFixed(2)}
                                      </span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-gray-500">Commission:</span>
                                      <span className="text-sm font-medium text-green-600">
                                        ${product.commission_amount.toFixed(2)}({product.commission_rate}%)
                                      </span>
                                    </div>

                                    <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                                      <span className="text-xs font-medium text-gray-700">Final Price:</span>
                                      <span className="text-sm font-bold text-blue-600">
                                        ${product.final_price.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </RouteGuard>
  )
} 