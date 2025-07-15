// Pricing calculation utilities for customer onboarding

export interface PricingSettings {
  processing_fee_percentage: number
  sales_tax_percentage: number
  price_rounding_direction: 'up' | 'down'
  price_rounding_increment: number
}

export interface ProductPricing {
  basePrice: number
  commission: number
  processingFee: number
  salesTax: number
  subtotal: number
  finalPrice: number
  roundingAdjustment: number
}

/**
 * Calculate the final vending price for a product
 */
export function calculateVendingPrice(
  basePrice: number,
  commissionPercentage: number,
  processingFeePercentage: number,
  salesTaxPercentage: number,
  roundingDirection: 'up' | 'down',
  roundingIncrement: number
): {
  finalPrice: number
  commissionAmount: number
  processingFeeAmount: number
  salesTaxAmount: number
  roundingDifference: number
} {
  // Calculate commission amount
  const commissionAmount = basePrice * (commissionPercentage / 100)
  
  // Calculate fees on commission amount
  const processingFeeAmount = commissionAmount * (processingFeePercentage / 100)
  const salesTaxAmount = commissionAmount * (salesTaxPercentage / 100)
  
  // Calculate subtotal
  const subtotal = basePrice + commissionAmount + processingFeeAmount + salesTaxAmount
  
  // Apply rounding
  const finalPrice = roundPrice(subtotal, roundingDirection, roundingIncrement)
  const roundingDifference = finalPrice - subtotal
  
  return {
    finalPrice,
    commissionAmount,
    processingFeeAmount,
    salesTaxAmount,
    roundingDifference
  }
}

/**
 * Round a price to the nearest increment
 */
function roundPrice(price: number, direction: 'up' | 'down', increment: number): number {
  const multiplier = 1 / increment
  
  if (direction === 'up') {
    // Always round up to the next increment
    return Math.ceil(price * multiplier) / multiplier
  } else {
    // Always round down to the previous increment
    return Math.floor(price * multiplier) / multiplier
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

/**
 * Format price for display (alias for formatCurrency)
 */
export function formatPrice(amount: number): string {
  return formatCurrency(amount)
}

/**
 * Calculate commission percentage from commission amount and base price
 */
export function calculateCommissionPercentage(commissionAmount: number, basePrice: number): number {
  return (commissionAmount / basePrice) * 100
}

/**
 * Validate pricing settings
 */
export function validatePricingSettings(settings: Partial<PricingSettings>): boolean {
  return !!(
    settings.processing_fee_percentage !== undefined &&
    settings.sales_tax_percentage !== undefined &&
    settings.price_rounding_direction &&
    settings.price_rounding_increment &&
    settings.processing_fee_percentage >= 0 &&
    settings.sales_tax_percentage >= 0 &&
    [0.05, 0.10, 0.25, 0.50].includes(settings.price_rounding_increment)
  )
} 