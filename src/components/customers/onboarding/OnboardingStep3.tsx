'use client'

import React, { useState, useEffect } from 'react'
import MachineTemplateCard from '@/components/MachineTemplateCard';

interface OnboardingStep3Props {
  data: any
  onUpdate: (data: any) => void
  onNext: () => void
  onPrev: () => void
}

export default function OnboardingStep3({ data, onUpdate, onNext, onPrev }: OnboardingStep3Props) {
  const [commissionRate, setCommissionRate] = useState(data.default_commission_rate || 0)
  const [applyToAll, setApplyToAll] = useState(true)
  const [batchMode, setBatchMode] = useState(false);
  const [lockedCommissions, setLockedCommissions] = useState<{ [key: string]: number }>({}); // key: product id or slot id

  // Reset locks when batch mode is turned off
  const handleBatchModeToggle = () => {
    if (batchMode) {
      setLockedCommissions({});
    }
    setBatchMode(!batchMode);
  };

  // Lock/unlock a product's commission
  const handleLockToggle = (productKey: string, commission: number) => {
    setLockedCommissions((prev) => {
      if (prev[productKey] !== undefined) {
        const updated = { ...prev };
        delete updated[productKey];
        return updated;
      } else {
        return { ...prev, [productKey]: commission };
      }
    });
  };

  // Update data when commission rate changes
  useEffect(() => {
    const updatedProducts = data.products?.map((product: any) => {
      const commissionAmount = (product.base_price * commissionRate) / 100
      const processingFee = (commissionAmount * (data.processing_fee_percentage || 0)) / 100
      const salesTax = (commissionAmount * (data.sales_tax_percentage || 0)) / 100
      const calculatedPrice = product.base_price + commissionAmount + processingFee + salesTax
      const finalPrice = Math.ceil(calculatedPrice * 4) / 4 // Round up to nearest quarter
      
      return {
        ...product,
        commission_rate: applyToAll ? commissionRate : product.commission_rate,
        commission_amount: applyToAll ? commissionAmount : product.commission_amount,
        processing_fee: applyToAll ? processingFee : product.processing_fee,
        sales_tax: applyToAll ? salesTax : product.sales_tax,
        final_price: applyToAll ? finalPrice : product.final_price
      }
    }) || []

    onUpdate({
      default_commission_rate: commissionRate,
      products: updatedProducts
    })
  }, [commissionRate, applyToAll])

  // Calculate final price with correct logic and round up to nearest quarter
  const calculateFinalPrice = (basePrice: number, commissionRate: number) => {
    const commissionAmount = (basePrice * commissionRate) / 100
    // Processing fee and sales tax only apply to the commission amount, not the base price
    const processingFee = (commissionAmount * (data.processing_fee_percentage || 0)) / 100
    const salesTax = (commissionAmount * (data.sales_tax_percentage || 0)) / 100
    const calculatedPrice = basePrice + commissionAmount + processingFee + salesTax
    
    // Round up to the nearest quarter (25 cents)
    return Math.ceil(calculatedPrice * 4) / 4
  }

  // Calculate totals with correct logic and rounding
  const calculateTotals = () => {
    if (!data.products) return { baseTotal: 0, commissionTotal: 0, processingFeeTotal: 0, salesTaxTotal: 0, finalTotal: 0 }

    return data.products.reduce((totals: any, product: any) => {
      const commissionAmount = (product.base_price * commissionRate) / 100
      const processingFee = (commissionAmount * (data.processing_fee_percentage || 0)) / 100
      const salesTax = (commissionAmount * (data.sales_tax_percentage || 0)) / 100
      const calculatedPrice = product.base_price + commissionAmount + processingFee + salesTax
      const finalPrice = Math.ceil(calculatedPrice * 4) / 4 // Round up to nearest quarter
      
      return {
        baseTotal: totals.baseTotal + (product.base_price || 0),
        commissionTotal: totals.commissionTotal + commissionAmount,
        processingFeeTotal: totals.processingFeeTotal + processingFee,
        salesTaxTotal: totals.salesTaxTotal + salesTax,
        finalTotal: totals.finalTotal + finalPrice
      }
    }, { baseTotal: 0, commissionTotal: 0, processingFeeTotal: 0, salesTaxTotal: 0, finalTotal: 0 })
  }

  const totals = calculateTotals()

  // Handle continue
  const handleContinue = () => {
    if (commissionRate < 0 || commissionRate > 100) {
      alert('Commission rate must be between 0% and 100%')
      return
    }
    onNext()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Commission Settings</h2>
        <p className="text-gray-600">
          Set commission rates and review pricing for your products
        </p>
        <div className="mt-2 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Pricing Logic:</strong> Processing fees and sales tax are calculated only on the commission amount, not the base product price. Final prices are rounded up to the nearest quarter (25¢).
          </p>
        </div>
      </div>

      {/* Batch Mode Toggle */}
      <div className="flex items-center mb-4">
        <label className="mr-2 font-medium text-gray-700">Batch Mode</label>
        <button
          type="button"
          onClick={handleBatchModeToggle}
          className={`px-3 py-1 rounded ${batchMode ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          {batchMode ? 'On' : 'Off'}
        </button>
      </div>

      {/* Commission Rate Setting */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Default Commission Rate</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commission Rate: {commissionRate}%
            </label>
            <input
              type="range"
              min="0"
              max="50"
              step="0.5"
              value={commissionRate}
              onChange={(e) => setCommissionRate(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              disabled={batchMode && Object.keys(lockedCommissions).length === data.products.length}
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

          <div className="flex items-center">
            <input
              type="checkbox"
              id="applyToAll"
              checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="applyToAll" className="ml-2 block text-sm text-gray-900">
              Apply this commission rate to all products
            </label>
          </div>
        </div>
      </div>

      {/* Pricing Summary */}
      {/* Removed summary totals section as per user request */}

      {/* Product Card Grid - Grouped by Row */}
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
                    // Use a unique key for each product (row/slot or id)
                    const productKey = `${product.row_number}-${product.slot_number}`;
                    // Determine commission rate for this card
                    const isLocked = batchMode && lockedCommissions[productKey] !== undefined;
                    const cardCommission = isLocked ? lockedCommissions[productKey] : commissionRate;
                    // Calculate commission, fees, tax, rounding, and final price
                    const commissionAmount = (product.base_price * cardCommission) / 100;
                    const processingFee = (commissionAmount * (data.processing_fee_percentage || 0)) / 100;
                    const salesTax = (commissionAmount * (data.sales_tax_percentage || 0)) / 100;
                    const calculatedPrice = product.base_price + commissionAmount + processingFee + salesTax;
                    const finalPrice = Math.ceil(calculatedPrice * 4) / 4;
                    const roundingAdjustment = finalPrice - calculatedPrice;

                    return (
                      <div key={index} className="bg-white border rounded-lg p-4 shadow-sm flex flex-col items-center w-64 relative">
                        {/* Lock/Unlock button in batch mode */}
                        {batchMode && (
                          <button
                            type="button"
                            onClick={() => handleLockToggle(productKey, cardCommission)}
                            className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold ${isLocked ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                          >
                            {isLocked ? 'Locked' : 'Lock'}
                          </button>
                        )}
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
                        {isLocked && (
                          <div className="mt-1 text-xs text-blue-600 text-center w-full">Locked at {cardCommission}%</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Confirmation Section */}
      {/* Removed confirmation section as per user request */}

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
          Continue to Location Details
        </button>
      </div>
    </div>
  )
} 