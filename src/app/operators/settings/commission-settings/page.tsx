'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Company } from '@/types'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import RouteGuard from '@/components/auth/RouteGuard'

export default function CommissionSettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const { showToast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    processing_fee_percentage: '',
    sales_tax_percentage: '',
    price_rounding_direction: 'up',
    price_rounding_increment: '0.25'
  })

  useEffect(() => {
    if (user?.company_id) {
      fetchCompanyData()
    }
  }, [user])

  const fetchCompanyData = async () => {
    try {
      if (!user?.company_id) {
        setLoading(false)
        return
      }

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', user.company_id)
        .single()

      if (!companyError && companyData) {
        setCompany(companyData)
        setFormData({
          processing_fee_percentage: companyData.processing_fee_percentage?.toString() || '',
          sales_tax_percentage: companyData.sales_tax_percentage?.toString() || '',
          price_rounding_direction: companyData.price_rounding_direction || 'up',
          price_rounding_increment: companyData.price_rounding_increment?.toString() || '0.25'
        })
      } else {
        console.error('Error fetching company data:', companyError)
        showToast('Error loading company data', 'error')
      }
    } catch (error) {
      console.error('Error fetching company data:', error)
      showToast('Error loading company data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!user?.company_id) {
        showToast('No company associated with your account', 'error')
        return
      }

      const updateData = {
        processing_fee_percentage: formData.processing_fee_percentage ? parseFloat(formData.processing_fee_percentage) : null,
        sales_tax_percentage: formData.sales_tax_percentage ? parseFloat(formData.sales_tax_percentage) : null,
        price_rounding_direction: formData.price_rounding_direction,
        price_rounding_increment: formData.price_rounding_increment ? parseFloat(formData.price_rounding_increment) : 0.25
      }

      const { error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', user.company_id)

      if (error) throw error

      showToast('Commission settings updated successfully', 'success')
      fetchCompanyData() // Refresh data
    } catch (error) {
      console.error('Error updating commission settings:', error)
      showToast('Error updating commission settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (loading) {
    return (
      <RouteGuard requiredRoles={['operator']}>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard requiredRoles={['operator']}>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Commission Settings</h1>
            <p className="text-gray-600">Configure your commission rates and pricing settings.</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="processing_fee_percentage" className="block text-sm font-medium text-gray-700 mb-2">
                  Processing Fee Percentage
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  id="processing_fee_percentage"
                  name="processing_fee_percentage"
                  value={formData.processing_fee_percentage}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter processing fee percentage"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Percentage fee charged for processing transactions.
                </p>
              </div>

              <div>
                <label htmlFor="sales_tax_percentage" className="block text-sm font-medium text-gray-700 mb-2">
                  Sales Tax Percentage
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  id="sales_tax_percentage"
                  name="sales_tax_percentage"
                  value={formData.sales_tax_percentage}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter sales tax percentage"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Sales tax rate applied to transactions.
                </p>
              </div>

              <div>
                <label htmlFor="price_rounding_direction" className="block text-sm font-medium text-gray-700 mb-2">
                  Price Rounding Direction
                </label>
                <select
                  id="price_rounding_direction"
                  name="price_rounding_direction"
                  value={formData.price_rounding_direction}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="up">Round Up</option>
                  <option value="down">Round Down</option>
                  <option value="nearest">Round to Nearest</option>
                </select>
              </div>

              <div>
                <label htmlFor="price_rounding_increment" className="block text-sm font-medium text-gray-700 mb-2">
                  Price Rounding Increment
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  id="price_rounding_increment"
                  name="price_rounding_increment"
                  value={formData.price_rounding_increment}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter rounding increment"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Increment to round prices to (e.g., 0.25 for quarters).
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </RouteGuard>
  )
} 
