'use client'

import React, { useState, useEffect } from 'react'
import { formatPrice } from '@/lib/pricing-utils'
import { supabase } from '@/lib/supabase'
import MachineTemplateCard from '@/components/MachineTemplateCard'

interface OnboardingStep4Props {
  data: any
  onUpdate: (data: any) => void
  onSubmit: () => void
  onPrev: () => void
  saving: boolean
}

export default function OnboardingStep4({ data, onUpdate, onSubmit, onPrev, saving }: OnboardingStep4Props) {
  const [operatorData, setOperatorData] = useState<any>(null)
  const [machineData, setMachineData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOperatorAndMachineData()
  }, [data.company_id, data.company_machine_template_id])

  const loadOperatorAndMachineData = async () => {
    try {
      setLoading(true)

      console.log('Loading data with company_id:', data.company_id)
      console.log('Loading data with machine_template_id:', data.company_machine_template_id)

      // Load operator/company data
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          logo_url,
          primary_contact_name,
          primary_contact_phone,
          primary_contact_email,
          description
        `)
        .eq('id', data.company_id)
        .single()

      console.log('Company query result:', { companyData, companyError })

      if (!companyError && companyData) {
        console.log('Operator data loaded:', companyData)
        setOperatorData(companyData)
      } else {
        console.error('Error loading operator data:', companyError)
        console.log('Company ID being queried:', data.company_id)
      }

      // Load machine template data
      const { data: machineTemplate, error: machineError } = await supabase
        .from('company_machine_templates')
        .select(`
          id,
          name,
          category_id,
          image_url,
          dimensions,
          slot_count,
          slot_configuration,
          machine_category:machine_categories (
            id,
            name
          )
        `)
        .eq('id', data.company_machine_template_id)
        .single()

      if (!machineError && machineTemplate) {
        console.log('Machine data loaded:', machineTemplate)
        setMachineData(machineTemplate)
      } else {
        console.error('Error loading machine data:', machineError)
        console.log('Machine template ID being queried:', data.company_machine_template_id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading confirmation data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Final Review & Confirmation</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Please review all the information below before submitting your machine onboarding request.
        </p>
      </div>

      {/* Operator Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Operator Information</h2>
        {operatorData && (
          <div className="flex items-start space-x-6">
            {/* Company Logo */}
            <div className="flex-shrink-0">
              {operatorData.logo_url ? (
                <img
                  src={operatorData.logo_url}
                  alt={`${operatorData.name} logo`}
                  className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              )}
            </div>

            {/* Company Details */}
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{operatorData.name}</h3>
                {operatorData.description && (
                  <p className="text-gray-600 mb-4">{operatorData.description}</p>
                )}
              </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Primary Contact</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {operatorData.primary_contact_name || 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Contact Phone</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {operatorData.primary_contact_phone || 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Contact Email</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {operatorData.primary_contact_email || 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Website</label>
                  <p className="text-lg font-semibold text-gray-900">Not available</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4">
                <a
                  href={`/${encodeURIComponent(operatorData.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Company Profile
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Machine Confirmation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Machine Confirmation</h2>
        {machineData && (
          <div className="flex justify-center">
            <div className="w-full max-w-sm">
              <MachineTemplateCard
                template={{
                  id: machineData.id,
                  name: machineData.name,
                  category: Array.isArray(machineData.machine_category) 
                    ? machineData.machine_category[0]?.name || 'Unknown'
                    : machineData.machine_category?.name || 'Unknown',
                  category_id: machineData.category_id,
                  image_url: machineData.image_url,
                  dimensions: machineData.dimensions || 'N/A',
                  slot_count: machineData.slot_count || 0
                }}
                showDetails={true}
                showTechnicalDetails={false}
              />
            </div>
          </div>
        )}
      </div>

      {/* Product Configuration Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Product Configuration</h2>
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
                              <p className="text-xs text-gray-500">Selection {product.alias}</p>
                            </div>
          </div>

                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Commission:</span>
                              <span className="font-medium text-green-600">{product.commission_rate}% ({formatPrice(product.commission_amount)})</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Final Price:</span>
                              <span className="font-bold text-blue-600">{formatPrice(product.final_price)}</span>
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

      {/* Location Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Location Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Host Business</label>
            <p className="text-lg font-semibold text-gray-900">{data.host_business_name || 'Not provided'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Placement Area</label>
            <p className="text-lg font-semibold text-gray-900">{data.machine_placement_area || 'Not provided'}</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
            <p className="text-lg font-semibold text-gray-900">{data.host_address || 'Not provided'}</p>
            {data.host_latitude && data.host_longitude && (
              <p className="text-sm text-gray-500 mt-1">
                Coordinates: {data.host_latitude.toFixed(6)}, {data.host_longitude.toFixed(6)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Point of Contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Contact Name</label>
            <p className="text-lg font-semibold text-gray-900">{data.point_of_contact_name || 'Not provided'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Position/Title</label>
            <p className="text-lg font-semibold text-gray-900">{data.point_of_contact_position || 'Not provided'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Email Address</label>
            <p className="text-lg font-semibold text-gray-900">{data.point_of_contact_email || 'Not provided'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Phone Number</label>
            <p className="text-lg font-semibold text-gray-900">{data.point_of_contact_phone || 'Not provided'}</p>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-blue-800">Ready to submit?</h3>
            <div className="mt-2 text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Review all information above carefully</li>
                <li>Click "Submit Onboarding Request" to complete the process</li>
                <li>The operator will review your information and contact you</li>
                <li>Once approved, installation will be scheduled</li>
                <li>You'll receive access to your machine dashboard</li>
              </ul>
            </div>
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
          onClick={onSubmit}
          disabled={saving}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting...
            </>
          ) : (
            'Submit Onboarding Request'
          )}
        </button>
      </div>
    </div>
  )
} 