'use client'

import React from 'react'
import { CustomerMachine } from '@/types'
import { useRouter } from 'next/navigation'

interface CustomerMachineCardProps {
  machine: CustomerMachine
  onUpdate?: () => void
}

export default function CustomerMachineCard({ machine, onUpdate }: CustomerMachineCardProps) {
  const router = useRouter()

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

  const statusInfo = getStatusInfo(machine.approval_status)

  // Get progress percentage
  const getProgressPercentage = () => {
    if (machine.approval_status === 'approved') return 100
    if (machine.approval_status === 'rejected') return 0
    
    // Calculate based on onboarding steps completed
    let completedSteps = 0
    if (machine.company_machine_template_id) completedSteps++
    if (machine.host_business_name) completedSteps++
    if (machine.host_address) completedSteps++
    if (machine.default_commission_rate !== null) completedSteps++
    
    // Assuming 4 main steps: template selection, location, commission, approval
    return Math.round((completedSteps / 4) * 100)
  }

  const progressPercentage = getProgressPercentage()

  // Handle view details
  const handleViewDetails = () => {
    // For now, we'll just show an alert with basic info
    // In the future, this could navigate to a detailed view page
    alert(`Machine Details:\n\nTemplate: ${machine.machine_template?.name || 'Unknown'}\nCompany: ${machine.company?.name || 'Unknown'}\nStatus: ${statusInfo.label}\nLocation: ${machine.host_business_name || 'Not set'}`)
  }

  // Handle continue onboarding
  const handleContinueOnboarding = () => {
    // This would navigate to the onboarding flow
    // For now, just show an alert
    alert('Continue onboarding functionality will be implemented next.')
  }

  return (
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
                {machine.machine_template?.name || `Machine Template #${machine.company_machine_template_id}`}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {machine.company?.name || `Company #${machine.company_id}`}
                </span>
                <span className="text-gray-400">•</span>
                <span>{new Date(machine.created_at).toLocaleDateString()}</span>
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
        {/* Progress Bar for Pending/In Progress */}
        {(machine.approval_status === 'pending' || machine.onboarding_status === 'in_progress') && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-gray-700">Onboarding Progress</h4>
              </div>
              <span className="text-sm font-medium text-blue-600">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Quick Stats for Approved Machines */}
        {machine.approval_status === 'approved' && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {machine.default_commission_rate || 0}%
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Commission</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {machine.nayax_machine_id ? 'Active' : 'Pending'}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {machine.host_business_name ? 'Set' : 'Not Set'}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Location</div>
            </div>
          </div>
        )}

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
                </div>
              </div>
            </div>
          )}

          {/* Commission Info */}
          {machine.default_commission_rate !== null && (
            <div>
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-gray-700">Commission</h4>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-16">Rate:</span>
                    <span className="text-gray-600">{machine.default_commission_rate}%</span>
                  </div>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
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
        </div>

        {/* Actions */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex space-x-3">
            <button
              onClick={handleViewDetails}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              View Details
            </button>
            
            {(machine.approval_status === 'pending' || machine.onboarding_status === 'in_progress') && (
              <button
                onClick={handleContinueOnboarding}
                className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 