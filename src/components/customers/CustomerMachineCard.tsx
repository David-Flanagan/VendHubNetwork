'use client'

import React, { useState } from 'react'
import { CustomerMachine } from '@/types'
import { useRouter } from 'next/navigation'
import SlotConfigurationModal from './SlotConfigurationModal'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'

interface CustomerMachineCardProps {
  machine: CustomerMachine
  onUpdate?: () => void
}

export default function CustomerMachineCard({ machine, onUpdate }: CustomerMachineCardProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const { user } = useAuth()
  const [showSlotModal, setShowSlotModal] = useState(false)

  // Format date to American format (MM/DD/YYYY)
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Invalid Date'
    }
  }

  // Get status display info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'in_progress':
        return {
          label: 'Onboarding in Progress',
          color: 'bg-yellow-100 text-yellow-800',
          bgGradient: 'bg-gradient-to-r from-yellow-50 to-orange-50',
          borderColor: 'border-yellow-200',
          iconColor: 'bg-yellow-100',
          textColor: 'text-yellow-600',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
      case 'pending':
        return {
          label: 'Pending Approval',
          color: 'bg-orange-100 text-orange-800',
          bgGradient: 'bg-gradient-to-r from-orange-50 to-red-50',
          borderColor: 'border-orange-200',
          iconColor: 'bg-orange-100',
          textColor: 'text-orange-600',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
      case 'approved':
        return {
          label: 'Active',
          color: 'bg-green-100 text-green-800',
          bgGradient: 'bg-gradient-to-r from-green-50 to-emerald-50',
          borderColor: 'border-green-200',
          iconColor: 'bg-green-100',
          textColor: 'text-green-600',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )
        }
      case 'rejected':
        return {
          label: 'Rejected',
          color: 'bg-red-100 text-red-800',
          bgGradient: 'bg-gradient-to-r from-red-50 to-pink-50',
          borderColor: 'border-red-200',
          iconColor: 'bg-red-100',
          textColor: 'text-red-600',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )
        }
      case 'abandoned':
        return {
          label: 'Abandoned',
          color: 'bg-gray-100 text-gray-800',
          bgGradient: 'bg-gradient-to-r from-gray-50 to-gray-100',
          borderColor: 'border-gray-200',
          iconColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )
        }
      default:
        return {
          label: 'Unknown',
          color: 'bg-gray-100 text-gray-800',
          bgGradient: 'bg-gradient-to-r from-gray-50 to-gray-100',
          borderColor: 'border-gray-200',
          iconColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
    }
  }

  const statusInfo = getStatusInfo(machine.approval_status || 'unknown')

  // Get progress percentage
  const getProgressPercentage = () => {
    if (machine.approval_status === 'approved') return 100
    if (machine.approval_status === 'rejected' || machine.approval_status === 'abandoned') return 0
    
    // Calculate based on onboarding steps completed
    let completedSteps = 0
    if (machine.company_machine_template_id) completedSteps++
    if (machine.host_business_name) completedSteps++
    if (machine.host_address) completedSteps++
    if (machine.default_commission_rate !== null && machine.default_commission_rate !== undefined) completedSteps++
    
    // Assuming 4 main steps: template selection, location, commission, approval
    return Math.round((completedSteps / 4) * 100)
  }

  const progressPercentage = getProgressPercentage()

  // Handle view details
  const handleViewDetails = () => {
    // For now, we'll just show an alert with basic info
    // In the future, this could navigate to a detailed view page
    alert(`Machine Details:\n\nMachine: ${machine.machine_name || 'Unknown'}\nCompany: ${machine.company?.name || 'Unknown'}\nStatus: ${statusInfo.label}\nLocation: ${machine.host_business_name || 'Not set'}`)
  }

  // Handle continue onboarding
  const handleContinueOnboarding = () => {
    // This would navigate to the onboarding flow
    // For now, just show an alert
    alert('Continue onboarding functionality will be implemented next.')
  }

  // Handle cancel request
  const handleCancelRequest = async () => {
    // Show confirmation toast
    showToast('Cancelling machine request...', 'info')
    
    try {
      const { error } = await supabase
        .from('customer_machines')
        .update({ 
          approval_status: 'rejected',
          rejection_reason: 'Cancelled by customer'
        })
        .eq('id', machine.id)

      if (error) {
        console.error('Error cancelling request:', error)
        showToast('Error cancelling request. Please try again.', 'error')
        return
      }

      // Show success toast
      showToast('Machine request cancelled successfully.', 'success')

      // Refresh the data
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error cancelling request:', error)
      showToast('Error cancelling request. Please try again.', 'error')
    }
  }

  // Handle view slot configuration
  const handleViewSlotConfiguration = () => {
    setShowSlotModal(true)
  }

  // Safe access to machine data
  const machineName = machine.machine_name || `Machine #${machine.id?.slice(0, 8) || 'Unknown'}`
  const companyName = machine.company?.name || `Company #${machine.company_id || 'Unknown'}`
  const createdAt = machine.created_at ? formatDate(machine.created_at) : 'Unknown Date'
  
  // Create display name: "Business Name - Placement Area"
  const displayName = (() => {
    const businessName = machine.host_business_name || 'Unknown Business'
    const placementArea = machine.machine_placement_area || 'Unknown Area'
    return `${businessName} - ${placementArea}`
  })()

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
        {/* Card Header with Gradient */}
        <div className={`px-6 py-5 ${statusInfo.bgGradient} border-b ${statusInfo.borderColor}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${statusInfo.iconColor}`}>
                <div className={statusInfo.textColor}>
                  {statusInfo.icon}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {displayName}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {companyName}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span>{createdAt}</span>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color} border ${statusInfo.borderColor}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-6">
          {/* Machine Details */}
          <div className="space-y-4">
            {/* Location Info */}
            {machine.host_business_name && (
              <div>
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
                    {machine.host_address && (
                      <div className="flex items-start">
                        <span className="font-medium text-gray-700 w-16">Address:</span>
                        <span className="text-gray-600">{machine.host_address}</span>
                      </div>
                    )}
                    {machine.point_of_contact_name && (
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 w-16">Contact:</span>
                        <span className="text-gray-600">{machine.point_of_contact_name}</span>
                      </div>
                    )}
                    {machine.point_of_contact_position && (
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 w-16">Position:</span>
                        <span className="text-gray-600">{machine.point_of_contact_position}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Nayax Machine ID */}
            {machine.nayax_machine_id && (
              <div>
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-700">Machine ID</h4>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-sm">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 w-16">Nayax ID:</span>
                      <span className="text-gray-600 font-mono">{machine.nayax_machine_id}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Referral Commission */}
            {machine.referral_commission_percent && machine.referral_user_id === user?.id && (
              <div>
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-700">Your Referral Commission</h4>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="text-sm">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 w-24">Commission:</span>
                      <span className="text-green-600 font-semibold">{machine.referral_commission_percent}%</span>
                    </div>
                    <div className="mt-2 text-xs text-green-700">
                      You are eligible for commission on this machine's sales.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex space-x-3">
              <button
                onClick={handleViewSlotConfiguration}
                className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                View Slot Configuration
              </button>
              
              {/* Show View Referral Sales button for referral machines */}
              {machine.referral_user_id === user?.id && machine.approval_status === 'approved' && (
                <button
                  onClick={() => router.push(`/customers/dashboard/referral-sales?machine=${machine.id}`)}
                  className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  View Referral Sales
                </button>
              )}
              
              {(machine.approval_status === 'pending' || machine.onboarding_status === 'in_progress') && (
                <button
                  onClick={handleCancelRequest}
                  className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Cancel Request
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Slot Configuration Modal */}
      <SlotConfigurationModal
        machine={machine}
        isOpen={showSlotModal}
        onClose={() => setShowSlotModal(false)}
      />
    </>
  )
} 