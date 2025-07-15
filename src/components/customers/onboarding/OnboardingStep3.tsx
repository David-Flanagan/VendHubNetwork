'use client'

import React, { useState, useEffect, useRef } from 'react'
import { formatPrice } from '@/lib/pricing-utils'
import { geocodeAddress } from '@/lib/geocoding'

interface OnboardingStep3Props {
  data: any
  onUpdate: (data: any) => void
  onNext: () => void
  onPrev: () => void
}

export default function OnboardingStep3({ data, onUpdate, onNext, onPrev }: OnboardingStep3Props) {
  const onUpdateRef = useRef(onUpdate)
  
  // Update the ref when onUpdate changes
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  const [formData, setFormData] = useState({
    host_business_name: data.host_business_name || '',
    host_address: data.host_address || '',
    host_latitude: data.host_latitude || null,
    host_longitude: data.host_longitude || null,
    machine_placement_area: data.machine_placement_area || '',
    point_of_contact_name: data.point_of_contact_name || '',
    point_of_contact_position: data.point_of_contact_position || '',
    point_of_contact_email: data.point_of_contact_email || '',
    point_of_contact_phone: data.point_of_contact_phone || ''
  })

  // Update parent data when form changes
  useEffect(() => {
    onUpdateRef.current(formData)
  }, [formData])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handle address geocoding
  const handleAddressChange = async (address: string) => {
    handleInputChange('host_address', address)
    
    if (address.trim()) {
      try {
        const coordinates = await geocodeAddress(address)
        if (coordinates.success) {
          setFormData(prev => ({
            ...prev,
            host_latitude: coordinates.latitude,
            host_longitude: coordinates.longitude
          }))
        }
      } catch (error) {
        console.error('Geocoding error:', error)
      }
    }
  }

  const handleContinue = () => {
    // Validate required fields
    if (!formData.host_business_name.trim()) {
      alert('Please enter the host business name')
      return
    }
    if (!formData.host_address.trim()) {
      alert('Please enter the host business address')
      return
    }
    if (!formData.machine_placement_area.trim()) {
      alert('Please enter the machine placement area')
      return
    }
    if (!formData.point_of_contact_name.trim()) {
      alert('Please enter the point of contact name')
      return
    }
    if (!formData.point_of_contact_email.trim()) {
      alert('Please enter the point of contact email')
      return
    }
    if (!formData.point_of_contact_phone.trim()) {
      alert('Please enter the point of contact phone')
      return
    }

    onNext()
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Product Confirmation & Location Setup</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Review your configured products and provide location and contact information for your vending machine placement.
        </p>
      </div>

      {/* Product Confirmation Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Product Configuration</h2>
        


        {/* Product Grid */}
        {data.products && data.products.length > 0 && (
          <div className="space-y-6">
            {/* Group products by row */}
            {(() => {
              const productsByRow: { [row: string]: any[] } = {}
              data.products.forEach((product: any) => {
                if (!productsByRow[product.row_number]) {
                  productsByRow[product.row_number] = []
                }
                productsByRow[product.row_number].push(product)
              })
              
              const sortedRows = Object.keys(productsByRow).sort((a, b) => parseInt(a) - parseInt(b))
              
              return sortedRows.map((rowNum) => (
                <div key={rowNum} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Row {rowNum}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {productsByRow[rowNum]
                      .sort((a: any, b: any) => a.slot_number - b.slot_number)
                      .map((product: any, index: number) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center space-x-3 mb-3">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.product_name || 'Product'}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {product.product_name || 'Product Name'}
                              </h4>
                              <p className="text-xs text-gray-500">Slot {product.alias}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Base Price:</span>
                              <span className="font-medium">{formatPrice(product.base_price)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Commission ({product.commission_rate}%):</span>
                              <span className="font-medium text-green-600">{formatPrice(product.commission_amount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Processing Fee:</span>
                              <span className="font-medium text-orange-600">{formatPrice(product.processing_fee_amount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Sales Tax:</span>
                              <span className="font-medium text-red-600">{formatPrice(product.sales_tax_amount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Rounding:</span>
                              <span className={`font-medium ${product.rounding_difference >= 0 ? 'text-blue-600' : 'text-purple-600'}`}>
                                {product.rounding_difference >= 0 ? '+' : ''}{formatPrice(Math.abs(product.rounding_difference))}
                              </span>
                            </div>
                            <div className="border-t pt-1 mt-2">
                              <div className="flex justify-between">
                                <span className="font-semibold text-gray-900">Final Price:</span>
                                <span className="font-bold text-blue-600">{formatPrice(product.final_price)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))
            })()}
          </div>
        )}
      </div>

      {/* Location Setup Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Location Setup</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Host Business Name *
            </label>
            <input
              type="text"
              value={formData.host_business_name}
              onChange={(e) => handleInputChange('host_business_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Downtown Coffee Shop"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Machine Placement Area *
            </label>
            <input
              type="text"
              value={formData.machine_placement_area}
              onChange={(e) => handleInputChange('machine_placement_area', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Break room, Lobby, Front entrance"
              required
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Host Business Address *
          </label>
          <input
            type="text"
            value={formData.host_address}
            onChange={(e) => handleAddressChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 123 Main St, City, State 12345"
            required
          />
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">
              Latitude (Auto-generated)
            </label>
            <input
              type="text"
              value={formData.host_latitude || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
              placeholder="Will be auto-generated from address"
              disabled
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">
              Longitude (Auto-generated)
            </label>
            <input
              type="text"
              value={formData.host_longitude || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
              placeholder="Will be auto-generated from address"
              disabled
            />
          </div>
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Point of Contact</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Name *
            </label>
            <input
              type="text"
              value={formData.point_of_contact_name}
              onChange={(e) => handleInputChange('point_of_contact_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., John Smith"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position/Title
            </label>
            <input
              type="text"
              value={formData.point_of_contact_position}
              onChange={(e) => handleInputChange('point_of_contact_position', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Facilities Manager"
            />
                      </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.point_of_contact_email}
              onChange={(e) => handleInputChange('point_of_contact_email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="contact@business.com"
              required
            />
                </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              value={formData.point_of_contact_phone}
              onChange={(e) => handleInputChange('point_of_contact_phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="(555) 123-4567"
              required
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <button
          onClick={onPrev}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handleContinue}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue to Confirmation →
        </button>
      </div>
    </div>
  )
} 