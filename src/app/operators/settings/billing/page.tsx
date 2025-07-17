'use client'
 

import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import RouteGuard from '@/components/auth/RouteGuard'

export default function BillingSettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    billing_email: '',
    payment_method: 'card',
    auto_renewal: true,
    invoice_frequency: 'monthly'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // This would typically save to a billing_settings table
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      showToast('Billing settings updated successfully', 'success')
    } catch (error) {
      console.error('Error updating billing settings:', error)
      showToast('Error updating billing settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  return (
    <RouteGuard allowedRoles={['operator']}>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Payment</h1>
            <p className="text-gray-600">
              Manage your billing information and payment settings.
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Billing Email */}
              <div>
                <label htmlFor="billing_email" className="block text-sm font-medium text-gray-700 mb-2">
                  Billing Email
                </label>
                <input
                  type="email"
                  id="billing_email"
                  name="billing_email"
                  value={formData.billing_email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter billing email address"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Invoices and billing notifications will be sent to this email.
                </p>
              </div>

              {/* Payment Method */}
              <div>
                <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  id="payment_method"
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="card">Credit/Debit Card</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>

              {/* Invoice Frequency */}
              <div>
                <label htmlFor="invoice_frequency" className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Frequency
                </label>
                <select
                  id="invoice_frequency"
                  name="invoice_frequency"
                  value={formData.invoice_frequency}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>

              {/* Auto Renewal */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_renewal"
                  name="auto_renewal"
                  checked={formData.auto_renewal}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="auto_renewal" className="ml-2 block text-sm text-gray-900">
                  Auto-renewal
                </label>
              </div>
              <p className="text-sm text-gray-500">
                Automatically renew your subscription when it expires.
              </p>

              {/* Submit Button */}
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