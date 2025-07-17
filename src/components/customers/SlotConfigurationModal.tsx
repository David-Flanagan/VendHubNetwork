'use client'

import React from 'react'
import { CustomerMachine } from '@/types'

interface SlotConfigurationModalProps {
  machine: CustomerMachine
  isOpen: boolean
  onClose: () => void
}

interface SlotData {
  slot_number: number
  alias: string
  mdb_code: string
  product_name?: string
  brand_name?: string
  description?: string
  image_url?: string
  base_price: number
  commission_rate: number
  commission_amount: number
  final_price: number
  processing_fee_amount: number
  sales_tax_amount: number
  rounding_difference: number
  company_product_id?: string
  product_type_id?: string
  processing_fee_percentage: number
  sales_tax_percentage: number
}

interface RowData {
  row_number: number
  slots: SlotData[]
}

export default function SlotConfigurationModal({ machine, isOpen, onClose }: SlotConfigurationModalProps) {
  if (!isOpen) return null

  // Parse slot configuration from JSONB with error handling
  let slotConfig: any = null
  let rows: RowData[] = []
  
  try {
    slotConfig = machine.slot_configuration
    if (slotConfig && typeof slotConfig === 'object') {
      rows = slotConfig.rows || []
    }
  } catch (error) {
    console.error('Error parsing slot configuration:', error)
    rows = []
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(amount || 0)
    } catch (error) {
      console.error('Error formatting currency:', error)
      return '$0.00'
    }
  }

  // Format commission display: $2.20(20%)
  const formatCommission = (amount: number, rate: number) => {
    try {
      const currency = formatCurrency(amount || 0)
      const percentage = `${rate || 0}%`
      return `${currency}(${percentage})`
    } catch (error) {
      console.error('Error formatting commission:', error)
      return '$0.00(0%)'
    }
  }

  // Safe access to machine data
  const machineName = machine.machine_name || `Machine #${machine.id?.slice(0, 8) || 'Unknown'}`
  const companyName = machine.company?.name || `Company #${machine.company_id || 'Unknown'}`
  const slotCount = machine.slot_count || 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Slot Configuration - {machineName}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {companyName} • {slotCount} slots
              </p>
            </div>
            <button
              onClick={onClose}
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
          {rows.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No slot configuration</h3>
              <p className="mt-1 text-sm text-gray-500">
                This machine doesn't have any products configured yet.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {rows.map((row, rowIndex) => (
                <div key={row.row_number || rowIndex} className="bg-gray-50 rounded-xl p-4">
                  {/* Row Header */}
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-sm font-bold text-blue-600">{row.row_number || rowIndex + 1}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Row {row.row_number || rowIndex + 1}
                    </h3>
                    <span className="ml-2 text-sm text-gray-500">
                      ({row.slots?.length || 0} slots)
                    </span>
                  </div>

                  {/* Slots Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {(row.slots || []).map((slot, slotIndex) => (
                      <div key={`${row.row_number || rowIndex}-${slot.slot_number || slotIndex}`} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                        {/* Slot Header */}
                        <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                              {slot.alias || `Slot ${slot.slot_number || slotIndex + 1}`}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">
                              {slot.mdb_code || 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Product Content */}
                        <div className="p-3">
                          {slot.product_name ? (
                            <>
                              {/* Product Image */}
                              {slot.image_url && (
                                <div className="mb-3">
                                  <img
                                    src={slot.image_url}
                                    alt={slot.product_name}
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
                                    {slot.product_name}
                                  </h4>
                                  {slot.brand_name && (
                                    <p className="text-xs text-gray-500 truncate">
                                      {slot.brand_name}
                                    </p>
                                  )}
                                </div>

                                {/* Pricing Info */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-500">Base Price:</span>
                                    <span className="text-sm font-medium text-gray-900">
                                      {formatCurrency(slot.base_price)}
                                    </span>
                                  </div>
                                  
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-500">Commission:</span>
                                    <span className="text-sm font-medium text-blue-600">
                                      {formatCommission(slot.commission_amount, slot.commission_rate)}
                                    </span>
                                  </div>
                                  
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-500">Vending Price:</span>
                                    <span className="text-sm font-bold text-green-600">
                                      {formatCurrency(slot.final_price)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-4">
                              <div className="mx-auto h-8 w-8 text-gray-300 mb-2">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                              </div>
                              <p className="text-xs text-gray-500">No product</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 