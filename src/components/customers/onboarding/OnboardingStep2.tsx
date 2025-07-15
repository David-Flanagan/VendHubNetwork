'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'

interface MachineTemplate {
  id: string
  name: string
  category: string
  category_id: string
  image_url?: string
  dimensions: string
  slot_count: number
  slot_configuration: SlotConfiguration[]
}

interface SlotConfiguration {
  row: number
  slot: number
  product_type_id: string
  mdb_code: string
  product_choice?: string
  commission_rate?: number
  vend_price?: number
  processing_fee?: number
  sales_tax?: number
}

interface Product {
  id: string
  price: number
  is_available: boolean
  global_product: {
    id: string
    brand_name: string
    product_name: string
    description: string
    product_type_id: string
    product_category_id: string
    image_url?: string
  }
}

interface OnboardingStep2Props {
  data: any
  onUpdate: (data: any) => void
  onNext: () => void
  onPrev: () => void
}

export default function OnboardingStep2({ data, onUpdate, onNext, onPrev }: OnboardingStep2Props) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [templateData, setTemplateData] = useState<MachineTemplate | null>(null)
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<any[]>([])

  // Log the data received
  console.log('OnboardingStep2 received data:', data)

  // Load template and products data
  useEffect(() => {
    loadTemplateAndProducts()
  }, [data.company_id, data.company_machine_template_id])

  const loadTemplateAndProducts = async () => {
    try {
      setLoading(true)
      console.log('Loading template and products for company:', data.company_id, 'template:', data.company_machine_template_id)

      // Load the company machine template with the global template's slot configuration
      const { data: companyTemplate, error: companyTemplateError } = await supabase
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
            slot_configuration,
            machine_category:machine_categories (
              id,
              name
            )
          )
        `)
        .eq('id', data.company_machine_template_id)
        .eq('is_active', true)
        .single()

      console.log('Company template query result:', companyTemplate)
      console.log('Company template query error:', companyTemplateError)

      if (companyTemplateError) {
        console.error('Error loading company machine template:', companyTemplateError)
        throw companyTemplateError
      }

      console.log('Company machine template loaded:', companyTemplate)
      
      if (!companyTemplate?.machine_template) {
        throw new Error('Machine template not found for this company')
      }

      // Format template data
      const machineTemplate = companyTemplate.machine_template as any
      const formattedTemplate: MachineTemplate = {
        id: machineTemplate.id,
        name: machineTemplate.name,
        category: machineTemplate.machine_category?.name || 'Unknown',
        category_id: machineTemplate.category_id,
        image_url: machineTemplate.image_url,
        dimensions: machineTemplate.dimensions || 'N/A',
        slot_count: machineTemplate.slot_count || 0,
        slot_configuration: machineTemplate.slot_configuration || []
      }
      
      setTemplateData(formattedTemplate)
      console.log('Slot configuration loaded:', formattedTemplate.slot_configuration)

      // Load available products for this company
      const { data: products, error: productsError } = await supabase
        .from('company_products')
        .select(`
          id,
          price,
          is_available,
          global_product:global_products!inner(
            id,
            brand_name,
            product_name,
            description,
            product_type_id,
            product_category_id,
            image_url
          )
        `)
        .eq('company_id', data.company_id)
        .eq('is_available', true)

      if (productsError) {
        console.error('Error loading products:', productsError)
        throw productsError
      }

      console.log('Available products loaded:', products)
      
      // Transform company products data to match interface
      const transformedProducts: Product[] = (products || []).map((product: any) => ({
        id: product.id,
        price: product.price,
        is_available: product.is_available,
        global_product: {
          id: product.global_product.id,
          brand_name: product.global_product.brand_name,
          product_name: product.global_product.product_name,
          description: product.global_product.description,
          product_type_id: product.global_product.product_type_id,
          product_category_id: product.global_product.product_category_id,
          image_url: product.global_product.image_url
        }
      }))
      
      setAvailableProducts(transformedProducts)

      // Initialize selected products array based on slot configurations
      const initialProducts = formattedTemplate.slot_configuration.map((slot, index) => ({
        slot_index: index,
        row_number: slot.row,
        slot_number: slot.slot,
        product_type_id: slot.product_type_id,
        mdb_code: slot.mdb_code,
        // Pre-filled values from template (if any)
        company_product_id: slot.product_choice || '',
        // Commission and pricing will be set in Step 3
        commission_rate: 0,
        vend_price: 0,
        processing_fee: 0,
        sales_tax: 0,
        // Calculated values
        base_price: 0,
        final_price: 0,
        commission_amount: 0
      }))

      setSelectedProducts(initialProducts)
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Error loading product data', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle product selection for a slot
  const handleProductSelection = (slotIndex: number, companyProductId: string) => {
    const product = availableProducts.find(p => p.id === companyProductId)
    if (!product) return

    const updatedProducts = [...selectedProducts]
    updatedProducts[slotIndex] = {
      ...updatedProducts[slotIndex],
      company_product_id: companyProductId,
      base_price: product.price,
      // Don't calculate final price, commission, or fees yet - that happens in Step 3
      commission_rate: 0,
      final_price: 0,
      commission_amount: 0,
      processing_fee: 0,
      sales_tax: 0,
      image_url: product.global_product.image_url || '', // Add image_url for Step 3
    }

    setSelectedProducts(updatedProducts)
    onUpdate({ products: updatedProducts })
  }

  // Note: Final price calculation will be done in Step 3 after commission is set
  // Processing fee and sales tax will only apply to the commission amount, not the base price

  // Get products by type
  const getProductsByType = (productTypeId: string) => {
    return availableProducts.filter(p => p.global_product.product_type_id === productTypeId)
  }

  // Handle continue
  const handleContinue = () => {
    // Validate that all slots have products selected
    const hasAllProducts = selectedProducts.every(p => p.company_product_id)
    if (!hasAllProducts) {
      showToast('Please select products for all slots', 'error')
      return
    }

    onNext()
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading products...</p>
      </div>
    )
  }

  if (!templateData) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error loading machine template</p>
      </div>
    )
  }

  if (!templateData.slot_configuration || templateData.slot_configuration.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">No slot configuration found for this machine template</p>
        <p className="text-gray-600 mt-2">Please contact the operator to configure this machine template</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Products</h2>
        <p className="text-gray-600">
          Choose products for each slot in your {templateData.name} machine ({templateData.slot_configuration.length} slots)
        </p>
      </div>

      {/* Product Selection Grid */}
      <div className="space-y-6">
        {selectedProducts.map((slot, index) => {
          const slotConfig = templateData.slot_configuration[index]
          const availableProductsForSlot = getProductsByType(slot.product_type_id)
          const selectedProduct = availableProducts.find(p => p.id === slot.company_product_id)
          
          return (
            <div key={index} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Slot {slot.row_number}-{slot.slot_number}
                  </h3>
                  <p className="text-sm text-gray-600">
                    MDB Code: {slot.mdb_code}
                  </p>
                </div>
                {selectedProduct && (
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ${selectedProduct.price.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Base Price
                    </p>
                  </div>
                )}
              </div>

              {/* Product Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableProductsForSlot.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelection(index, product.id)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                      slot.company_product_id === product.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {product.global_product.image_url ? (
                        <img
                          src={product.global_product.image_url}
                          alt={product.global_product.product_name}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {product.global_product.brand_name}
                        </h4>
                        <p className="text-sm text-gray-600 truncate">
                          {product.global_product.product_name}
                        </p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                          ${product.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {availableProductsForSlot.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No products available for this slot type</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <button
          onClick={onPrev}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  )
} 