'use client'

import React, { useState } from 'react'
import { useToast } from '@/contexts/ToastContext'

interface OnboardingStep4Props {
  data: any
  onUpdate: (data: any) => void
  onNext: () => void
  onPrev: () => void
}

export default function OnboardingStep4({ data, onUpdate, onNext, onPrev }: OnboardingStep4Props) {
  const { showToast } = useToast()
  const [formData, setFormData] = useState({
    host_business_name: data.host_business_name || '',
    machine_placement_area: data.machine_placement_area || '',
    host_address: data.host_address || '',
    host_latitude: data.host_latitude || null,
    host_longitude: data.host_longitude || null,
    point_of_contact_name: data.point_of_contact_name || '',
    point_of_contact_position: data.point_of_contact_position || '',
    point_of_contact_email: data.point_of_contact_email || '',
    point_of_contact_phone: data.point_of_contact_phone || ''
  })

  const handleInputChange = (field: string, value: string | number) => {
    const updatedData = { ...formData, [field]: value }
    setFormData(updatedData)
    onUpdate(updatedData)
  }

  const handleContinue = () => {
    // Validate required fields
    const requiredFields = [
      'host_business_name',
      'machine_placement_area',
      'host_address',
      'point_of_contact_name',
      'point_of_contact_position',
      'point_of_contact_email'
    ]

    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData])
    
    if (missingFields.length > 0) {
      showToast(`Please fill in all required fields: ${missingFields.join(', ')}`, 'error')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.point_of_contact_email)) {
      showToast('Please enter a valid email address', 'error')
      return
    }

    onNext()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Host Location Details</h2>
        <p className="text-gray-600">
          Provide information about where the machine will be placed and who to contact
        </p>
      </div>

      {/* Host Business Information */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Host Business Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.host_business_name}
              onChange={(e) => handleInputChange('host_business_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Downtown Coffee Shop"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Machine Placement Area <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.machine_placement_area}
              onChange={(e) => handleInputChange('machine_placement_area', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Break Room, Lobby, Cafeteria"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.host_address}
              onChange={(e) => handleInputChange('host_address', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 123 Main Street, City, State 12345"
              required
            />
          </div>
        </div>
      </div>

      {/* Point of Contact Information */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Point of Contact</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.point_of_contact_name}
              onChange={(e) => handleInputChange('point_of_contact_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., John Smith"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position/Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.point_of_contact_position}
              onChange={(e) => handleInputChange('point_of_contact_position', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Facilities Manager"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.point_of_contact_email}
              onChange={(e) => handleInputChange('point_of_contact_email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., john.smith@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.point_of_contact_phone}
              onChange={(e) => handleInputChange('point_of_contact_phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., (555) 123-4567"
            />
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Important Information
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                This information will be used by the operator to:
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Schedule machine installation</li>
                <li>Coordinate with your facility</li>
                <li>Handle maintenance and service requests</li>
                <li>Process payments and commissions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-6">
        <button
          onClick={onPrev}
          className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors font-medium"
        >
          ← Back
        </button>
        <button
          onClick={handleContinue}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Continue to Review
        </button>
      </div>
    </div>
  )
} 