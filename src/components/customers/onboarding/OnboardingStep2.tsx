'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'
import { calculateVendingPrice, formatPrice } from '@/lib/pricing-utils'

interface MachineTemplate {
  id: string
  name: string
  category: string
  category_id: string
  image_url?: string
  dimensions: string
  slot_count: number
  slot_configuration: any // JSON slot configuration
}

interface CompanyProduct {
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

interface ProductSelection {
  row_number: number
  slot_number: number
  alias: string
  mdb_code: string
  allowed_product_types: string[]
  company_product_id: string
  base_price: number
  commission_rate: number
  final_price: number
  commission_amount: number
  processing_fee_amount: number
  sales_tax_amount: number
  rounding_difference: number
  // Product details for display
  product_name?: string
  brand_name?: string
  image_url?: string
  description?: string
}

type CommissionMode = 'bulk' | 'individual'

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
  const [availableProducts, setAvailableProducts] = useState<CompanyProduct[]>([])
  const [productSelections, setProductSelections] = useState<ProductSelection[]>([])
  const [commissionMode, setCommissionMode] = useState<CommissionMode>('bulk')
  const [bulkCommissionRate, setBulkCommissionRate] = useState(0)
  const [companySettings, setCompanySettings] = useState({
    processing_fee_percentage: 2.90,
    sales_tax_percentage: 8.25,
    rounding_direction: 'up' as 'up' | 'down',
    rounding_increment: 0.05
  })

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

      // Load the company machine template (now contains all data directly)
      const { data: companyTemplate, error: companyTemplateError } = await supabase
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
        .eq('is_active', true)
        .single()

      console.log('Company template query result:', companyTemplate)
      console.log('Company template query error:', companyTemplateError)

      if (companyTemplateError) {
        console.error('Error loading company machine template:', companyTemplateError)
        throw companyTemplateError
      }

      console.log('Company machine template loaded:', companyTemplate)
      
      if (!companyTemplate) {
        throw new Error('Machine template not found for this company')
      }

      // Format template data
      const formattedTemplate: MachineTemplate = {
        id: companyTemplate.id,
        name: companyTemplate.name,
        category: Array.isArray(companyTemplate.machine_category) 
          ? companyTemplate.machine_category[0]?.name || 'Unknown'
          : companyTemplate.machine_category?.name || 'Unknown',
        category_id: companyTemplate.category_id,
        image_url: companyTemplate.image_url,
        dimensions: companyTemplate.dimensions || 'N/A',
        slot_count: companyTemplate.slot_count || 0,
        slot_configuration: companyTemplate.slot_configuration || { rows: [] }
      }
      
      setTemplateData(formattedTemplate)
      console.log('Slot configuration loaded:', formattedTemplate.slot_configuration)

      // Load company settings for processing fees and sales tax
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('processing_fee_percentage, sales_tax_percentage, price_rounding_direction, price_rounding_increment')
        .eq('id', data.company_id)
        .single()

      if (!companyError && companyData) {
        console.log('Company settings loaded:', companyData)
        setCompanySettings({
          processing_fee_percentage: companyData.processing_fee_percentage || 2.90,
          sales_tax_percentage: companyData.sales_tax_percentage || 8.25,
          rounding_direction: companyData.price_rounding_direction || 'up',
          rounding_increment: companyData.price_rounding_increment || 0.05
        })
      } else {
        console.error('Error loading company settings:', companyError)
        console.log('Using default company settings')
      }

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
      const transformedProducts: CompanyProduct[] = (products || []).map((product: any) => ({
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

      // Initialize product selections based on slot configuration
      const slotConfig = formattedTemplate.slot_configuration
      const initialSelections: ProductSelection[] = []
      
      if (slotConfig.rows) {
        slotConfig.rows.forEach((row: any) => {
          row.slots.forEach((slot: any) => {
            initialSelections.push({
              row_number: row.row_number,
              slot_number: slot.slot_number,
              alias: slot.alias,
        mdb_code: slot.mdb_code,
              allowed_product_types: slot.allowed_product_types || [],
              company_product_id: '',
              base_price: 0,
        commission_rate: 0,
        final_price: 0,
              commission_amount: 0,
              processing_fee_amount: 0,
              sales_tax_amount: 0,
              rounding_difference: 0
            })
          })
        })
      }

      setProductSelections(initialSelections)
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Error loading product data', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle product selection for a slot
  const handleProductSelection = (slotIndex: number, companyProductId: string | null) => {
    // If companyProductId is null, clear the selection
    if (companyProductId === null) {
      const updatedSelections = [...productSelections]
      updatedSelections[slotIndex] = {
        ...updatedSelections[slotIndex],
        company_product_id: '',
        base_price: 0,
        commission_rate: 0,
        final_price: 0,
        commission_amount: 0,
        processing_fee_amount: 0,
        sales_tax_amount: 0,
        rounding_difference: 0,
        // Clear product details
        product_name: '',
        brand_name: '',
        image_url: '',
        description: ''
      }
      setProductSelections(updatedSelections)
      onUpdate({ products: updatedSelections })
      return
    }

    const product = availableProducts.find(p => p.id === companyProductId)
    if (!product) return

    const updatedSelections = [...productSelections]
    updatedSelections[slotIndex] = {
      ...updatedSelections[slotIndex],
      company_product_id: companyProductId,
      base_price: product.price,
      commission_rate: commissionMode === 'bulk' ? bulkCommissionRate : 0,
      final_price: 0,
      commission_amount: 0,
      processing_fee_amount: 0,
      sales_tax_amount: 0,
      rounding_difference: 0,
      // Include product details for display
      product_name: product.global_product.product_name,
      brand_name: product.global_product.brand_name,
      image_url: product.global_product.image_url,
      description: product.global_product.description
    }

    // If in bulk mode, calculate pricing immediately
    if (commissionMode === 'bulk' && bulkCommissionRate > 0) {
      console.log('Calculating pricing with settings:', {
        basePrice: product.price,
        commissionRate: bulkCommissionRate,
        processingFee: companySettings.processing_fee_percentage,
        salesTax: companySettings.sales_tax_percentage,
        roundingDirection: companySettings.rounding_direction,
        roundingIncrement: companySettings.rounding_increment
      })
      
      const pricing = calculateVendingPrice(
        product.price,
        bulkCommissionRate,
        companySettings.processing_fee_percentage,
        companySettings.sales_tax_percentage,
        companySettings.rounding_direction,
        companySettings.rounding_increment
      )

      console.log('Pricing calculation result:', pricing)

      updatedSelections[slotIndex] = {
        ...updatedSelections[slotIndex],
        final_price: pricing.finalPrice,
        commission_amount: pricing.commissionAmount,
        processing_fee_amount: pricing.processingFeeAmount,
        sales_tax_amount: pricing.salesTaxAmount,
        rounding_difference: pricing.roundingDifference
      }
    }

    setProductSelections(updatedSelections)
    onUpdate({ products: updatedSelections })
  }

  // Handle bulk commission rate change
  const handleBulkCommissionChange = (commissionRate: number) => {
    setBulkCommissionRate(commissionRate)
    
    console.log('Bulk commission change - company settings:', {
      processing_fee_percentage: companySettings.processing_fee_percentage,
      sales_tax_percentage: companySettings.sales_tax_percentage,
      rounding_direction: companySettings.rounding_direction,
      rounding_increment: companySettings.rounding_increment
    })
    
    const updatedSelections = productSelections.map(selection => {
      if (!selection.company_product_id) return selection

      console.log('Calculating pricing for selection:', {
        basePrice: selection.base_price,
        commissionRate: commissionRate,
        processingFee: companySettings.processing_fee_percentage,
        salesTax: companySettings.sales_tax_percentage,
        roundingDirection: companySettings.rounding_direction,
        roundingIncrement: companySettings.rounding_increment
      })

      const pricing = calculateVendingPrice(
        selection.base_price,
        commissionRate,
        companySettings.processing_fee_percentage,
        companySettings.sales_tax_percentage,
        companySettings.rounding_direction,
        companySettings.rounding_increment
      )

      console.log('Pricing result:', {
        finalPrice: pricing.finalPrice,
        commissionAmount: pricing.commissionAmount,
        processingFeeAmount: pricing.processingFeeAmount,
        salesTaxAmount: pricing.salesTaxAmount,
        roundingDifference: pricing.roundingDifference
      })

      return {
        ...selection,
        commission_rate: commissionRate,
        final_price: pricing.finalPrice,
        commission_amount: pricing.commissionAmount,
        processing_fee_amount: pricing.processingFeeAmount,
        sales_tax_amount: pricing.salesTaxAmount,
        rounding_difference: pricing.roundingDifference
      }
    })

    setProductSelections(updatedSelections)
    onUpdate({ products: updatedSelections })
  }

  // Handle individual commission rate change
  const handleIndividualCommissionChange = (slotIndex: number, commissionRate: number) => {
    const selection = productSelections[slotIndex]
    if (!selection || !selection.company_product_id) return

    const updatedSelections = [...productSelections]
    const updatedSelection = {
      ...selection,
      commission_rate: commissionRate
    }

    // Calculate pricing
    const pricing = calculateVendingPrice(
      selection.base_price,
      commissionRate,
      companySettings.processing_fee_percentage,
      companySettings.sales_tax_percentage,
      companySettings.rounding_direction,
      companySettings.rounding_increment
    )

    updatedSelection.final_price = pricing.finalPrice
    updatedSelection.commission_amount = pricing.commissionAmount
    updatedSelection.processing_fee_amount = pricing.processingFeeAmount
    updatedSelection.sales_tax_amount = pricing.salesTaxAmount
    updatedSelection.rounding_difference = pricing.roundingDifference

    updatedSelections[slotIndex] = updatedSelection
    setProductSelections(updatedSelections)
    onUpdate({ products: updatedSelections })
  }

  // Get products by type
  const getProductsByType = (productTypeIds: string[]) => {
    return availableProducts.filter(p => 
      productTypeIds.includes(p.global_product.product_type_id)
    )
  }

  // Handle continue
  const handleContinue = () => {
    // Validate that all slots have products selected
    const hasAllProducts = productSelections.every(p => p.company_product_id)
    if (!hasAllProducts) {
      showToast('Please select products for all selections', 'error')
      return
    }

    // Validate that commission rates are set
    const hasAllCommissions = productSelections.every(p => p.commission_rate > 0)
    if (!hasAllCommissions) {
      showToast('Please set commission rates for all products', 'error')
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
        <p className="text-red-600">Machine template not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Configure Your Products</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Select products for each selection and set your commission rates. 
          <span className="block mt-2 text-blue-600 font-medium">
            Machine: {templateData.name}
          </span>
        </p>
      </div>

      {/* Commission Mode Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Commission Setup</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => setCommissionMode('bulk')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              commissionMode === 'bulk'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Apply to All Products
          </button>
          <button
            onClick={() => setCommissionMode('individual')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              commissionMode === 'individual'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Set Individual Rates
          </button>
        </div>

        {commissionMode === 'bulk' && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commission Rate for All Products: {bulkCommissionRate}%
            </label>
            <input
              type="range"
              min="0"
              max="50"
              step="0.5"
              value={bulkCommissionRate}
              onChange={(e) => handleBulkCommissionChange(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>10%</span>
              <span>20%</span>
              <span>30%</span>
              <span>40%</span>
              <span>50%</span>
            </div>
          </div>
        )}
      </div>

      {/* Product Configuration Grid */}
      <div className="space-y-8">
        {productSelections.map((selection, index) => {
          const selectedProduct = availableProducts.find(p => p.id === selection.company_product_id)
          const availableProductsForSlot = getProductsByType(selection.allowed_product_types)
          
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {selection.alias}
                  </h3>
                  <p className="text-sm text-gray-600">
                  Row {selection.row_number}, Position {selection.slot_number}
                </p>
              </div>

              {/* Product Selection Grid */}
              {!selectedProduct ? (
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-4">Select a Product</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableProductsForSlot.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelection(index, product.id)}
                        className="border-2 border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center space-x-3">
                      {product.global_product.image_url ? (
                        <img
                          src={product.global_product.image_url}
                          alt={product.global_product.product_name}
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
                            <h5 className="text-sm font-medium text-gray-900 truncate">
                          {product.global_product.brand_name}
                            </h5>
                        <p className="text-sm text-gray-600 truncate">
                          {product.global_product.product_name}
                        </p>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatPrice(product.price)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                  </div>
                </div>
              ) : (
                <div>
                  {/* Selected Product Display */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-4">
                      {selectedProduct.global_product.image_url && (
                        <img
                          src={selectedProduct.global_product.image_url}
                          alt={selectedProduct.global_product.product_name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {selectedProduct.global_product.brand_name} - {selectedProduct.global_product.product_name}
                        </h4>
                        <p className="text-sm text-gray-600">{selectedProduct.global_product.description}</p>
                      </div>
                      <button
                        onClick={() => handleProductSelection(index, null)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Change Product
                      </button>
                    </div>
                  </div>

                  {/* Individual Commission Rate (if in individual mode) */}
                  {commissionMode === 'individual' && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Commission Rate: {selection.commission_rate}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="0.5"
                        value={selection.commission_rate}
                        onChange={(e) => handleIndividualCommissionChange(index, parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0%</span>
                        <span>10%</span>
                        <span>20%</span>
                        <span>30%</span>
                        <span>40%</span>
                        <span>50%</span>
                      </div>
                    </div>
                  )}

                  {/* Pricing Breakdown */}
                  {selection.commission_rate > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-3">Pricing Breakdown</h5>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Base Price:</span>
                          <div className="font-semibold">{formatPrice(selection.base_price)}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Commission ({selection.commission_rate}%):</span>
                          <div className="font-semibold text-green-600">{formatPrice(selection.commission_amount)}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Processing Fee:</span>
                          <div className="font-semibold text-orange-600">{formatPrice(selection.processing_fee_amount)}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Sales Tax:</span>
                          <div className="font-semibold text-red-600">{formatPrice(selection.sales_tax_amount)}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Rounding:</span>
                          <div className={`font-semibold ${selection.rounding_difference >= 0 ? 'text-blue-600' : 'text-purple-600'}`}>
                            {selection.rounding_difference >= 0 ? '+' : ''}{formatPrice(Math.abs(selection.rounding_difference))}
                          </div>
                        </div>
              </div>

                      {/* Final Price */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-gray-900">Final Vending Price:</span>
                          <span className="text-2xl font-bold text-blue-600">{formatPrice(selection.final_price)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
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
          Continue →
        </button>
      </div>
    </div>
  )
} 