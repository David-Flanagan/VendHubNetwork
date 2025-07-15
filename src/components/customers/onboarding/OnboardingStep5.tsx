'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import MachineTemplateCard from '@/components/MachineTemplateCard'

interface MachineTemplate {
  id: string
  name: string
  category: string
  category_id: string
  image_url?: string
  dimensions: string
  slot_count: number
}

interface Company {
  id: string
  name: string
  description?: string
  contact_email?: string
  contact_phone?: string
  website?: string
  address?: string
}

interface OnboardingStep5Props {
  data: any
  onUpdate: (data: any) => void
  onSubmit: () => void
  onPrev: () => void
  saving: boolean
}

export default function OnboardingStep5({ data, onUpdate, onSubmit, onPrev, saving }: OnboardingStep5Props) {
  const [templateData, setTemplateData] = useState<MachineTemplate | null>(null)
  const [companyData, setCompanyData] = useState<Company | null>(null)
  const [productDetails, setProductDetails] = useState<any[]>([])

  // Load additional data for review
  useEffect(() => {
    loadReviewData()
  }, [data.company_id, data.company_machine_template_id])

  const loadReviewData = async () => {
    try {
      // Load company data
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', data.company_id)
        .single()

      if (!companyError) {
        setCompanyData(company)
      }

      // Load template data
      const { data: template, error: templateError } = await supabase
        .from('company_machine_templates')
        .select(`
          id,
          machine_template:machine_templates (
            id,
            name,
            category_id,
            image_url,
            dimensions,
            slot_count,
            machine_category:machine_categories (
              id,
              name
            )
          )
        `)
        .eq('id', data.company_machine_template_id)
        .single()

      if (!templateError && template?.machine_template) {
        const machineTemplate = template.machine_template as any
        
        // Get category name
        const categoryName = machineTemplate.machine_category?.name || 'Unknown'

        setTemplateData({
          id: machineTemplate.id,
          name: machineTemplate.name,
          category: categoryName,
          category_id: machineTemplate.category_id,
          image_url: machineTemplate.image_url,
          dimensions: machineTemplate.dimensions || 'N/A',
          slot_count: machineTemplate.slot_count || 0
        })
      }

      // Load product details
      if (data.products && data.products.length > 0) {
        const productIds = data.products.map((p: any) => p.company_product_id).filter(Boolean)
        if (productIds.length > 0) {
          const { data: products, error: productsError } = await supabase
            .from('company_products')
            .select(`
              id,
              price,
              global_product:global_products(
                id,
                brand_name,
                product_name,
                description
              )
            `)
            .in('id', productIds)

          if (!productsError) {
            setProductDetails(products || [])
          }
        }
      }
    } catch (error) {
      console.error('Error loading review data:', error)
    }
  }

  // Calculate totals
  const calculateTotals = () => {
    if (!data.products) return { baseTotal: 0, commissionTotal: 0, processingFeeTotal: 0, salesTaxTotal: 0, finalTotal: 0 }

    return data.products.reduce((totals: any, product: any) => ({
      baseTotal: totals.baseTotal + (product.base_price || 0),
      commissionTotal: totals.commissionTotal + (product.commission_amount || 0),
      processingFeeTotal: totals.processingFeeTotal + (product.processing_fee || 0),
      salesTaxTotal: totals.salesTaxTotal + (product.sales_tax || 0),
      finalTotal: totals.finalTotal + (product.final_price || 0)
    }), { baseTotal: 0, commissionTotal: 0, processingFeeTotal: 0, salesTaxTotal: 0, finalTotal: 0 })
  }

  const totals = calculateTotals()

  // Get product name by ID
  const getProductName = (companyProductId: string) => {
    const product = productDetails.find(p => p.id === companyProductId)
    if (product) {
      return `${product.global_product.brand_name} - ${product.global_product.product_name}`
    }
    return 'Unknown Product'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Setup</h2>
        <p className="text-gray-600">
          Please review all the information before submitting your machine request
        </p>
      </div>

      {/* Operator and Machine Information */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Operator & Machine Details</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Info */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Operator</h4>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h5 className="font-semibold text-gray-900">{companyData?.name || 'Loading...'}</h5>
              {companyData?.description && (
                <p className="text-sm text-gray-600 mt-1">{companyData.description}</p>
              )}
              <div className="mt-3 space-y-1 text-sm text-gray-500">
                {companyData?.contact_email && (
                  <div>📧 {companyData.contact_email}</div>
                )}
                {companyData?.contact_phone && (
                  <div>📞 {companyData.contact_phone}</div>
                )}
                {companyData?.address && (
                  <div>📍 {companyData.address}</div>
                )}
              </div>
            </div>
          </div>
          
          {/* Machine Template */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Selected Machine</h4>
            {templateData ? (
              <div className="w-full max-w-sm">
                <MachineTemplateCard
                  template={templateData}
                  showDetails={true}
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading machine details...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Host Location Information */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Host Location</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <p className="text-gray-900">{data.host_business_name}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Placement Area</label>
            <p className="text-gray-900">{data.machine_placement_area}</p>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <p className="text-gray-900">{data.host_address}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">Point of Contact</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <p className="text-gray-900">{data.point_of_contact_name}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <p className="text-gray-900">{data.point_of_contact_position}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <p className="text-gray-900">{data.point_of_contact_email}</p>
            </div>
            
            {data.point_of_contact_phone && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <p className="text-gray-900">{data.point_of_contact_phone}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Selection */}
      {data.products && data.products.length > 0 && (() => {
        // Group products by row_number
        const productsByRow: { [row: string]: any[] } = {};
        data.products.forEach((product: any) => {
          if (!productsByRow[product.row_number]) {
            productsByRow[product.row_number] = [];
          }
          productsByRow[product.row_number].push(product);
        });
        const sortedRows = Object.keys(productsByRow).sort((a: string, b: string) => parseInt(a) - parseInt(b));
        return (
          <div className="space-y-8">
            {sortedRows.map((rowNum: string) => (
              <div key={rowNum}>
                <div className="mb-2 text-sm font-semibold text-gray-700 text-center">Row {rowNum}</div>
                <div className="flex flex-wrap justify-center gap-4">
                  {productsByRow[rowNum as string].sort((a: any, b: any) => a.slot_number - b.slot_number).map((product: any, index: number) => {
                    // Calculate commission, fees, tax, rounding, and final price
                    const commissionAmount = (product.base_price * (product.commission_rate || 0)) / 100;
                    const processingFee = (commissionAmount * (data.processing_fee_percentage || 0)) / 100;
                    const salesTax = (commissionAmount * (data.sales_tax_percentage || 0)) / 100;
                    const calculatedPrice = product.base_price + commissionAmount + processingFee + salesTax;
                    const finalPrice = Math.ceil(calculatedPrice * 4) / 4;
                    const roundingAdjustment = finalPrice - calculatedPrice;
                    return (
                      <div key={index} className="bg-white border rounded-lg p-4 shadow-sm flex flex-col items-center w-64">
                        {/* Product image */}
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.product_name} className="h-24 w-24 object-contain rounded mb-2" />
                        ) : (
                          <div className="h-24 w-24 bg-gray-100 rounded mb-2 flex items-center justify-center text-gray-400">IMG</div>
                        )}
                        {/* Product name and type */}
                        <div className="font-semibold text-gray-900 mb-1 text-center w-full">{product.product_name || 'Product Name'}</div>
                        {product.product_type_name && (
                          <div className="text-xs text-gray-500 mb-1 text-center w-full">{product.product_type_name}</div>
                        )}
                        {/* Base price */}
                        <div className="text-green-600 font-medium mb-1 text-center w-full">Base: ${product.base_price?.toFixed(2) ?? '0.00'}</div>
                        {/* Detailed commission breakdown (centered) */}
                        <div className="text-sm text-gray-700 mb-1 text-center w-full">+ Commission: ${commissionAmount.toFixed(2)}</div>
                        <div className="text-sm text-gray-700 mb-1 text-center w-full">+ Increased Processing Fee: ${processingFee.toFixed(2)}</div>
                        <div className="text-sm text-gray-700 mb-1 text-center w-full">+ Increased Sales Tax: ${salesTax.toFixed(2)}</div>
                        <div className="text-sm text-gray-700 mb-1 text-center w-full">+ Rounding Adjustment: ${roundingAdjustment.toFixed(2)}</div>
                        {/* Final price */}
                        <div className="mt-2 text-lg font-semibold text-blue-700 text-center w-full">Vending Price: ${finalPrice.toFixed(2)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Important Notice */}
      <div className="bg-yellow-50 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Important Notice
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                By submitting this request, you agree to:
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Provide the specified location for machine installation</li>
                <li>Maintain the machine area according to operator requirements</li>
                <li>Coordinate with the operator for maintenance and service</li>
                <li>Receive commission payments based on the agreed rates</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-6">
        <button
          onClick={onPrev}
          disabled={saving}
          className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors font-medium disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          onClick={onSubmit}
          disabled={saving}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
        >
          {saving ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Submitting...
            </div>
          ) : (
            'Submit Machine Request'
          )}
        </button>
      </div>
    </div>
  )
} 