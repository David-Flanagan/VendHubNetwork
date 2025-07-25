'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Company } from '@/types'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import RouteGuard from '@/components/auth/RouteGuard'

export default function PrimaryContactSettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const { showToast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    primary_contact_name: '',
    primary_contact_phone: '',
    primary_contact_email: ''
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
          primary_contact_name: companyData.primary_contact_name || '',
          primary_contact_phone: companyData.primary_contact_phone || '',
          primary_contact_email: companyData.primary_contact_email || ''
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
        primary_contact_name: formData.primary_contact_name,
        primary_contact_phone: formData.primary_contact_phone,
        primary_contact_email: formData.primary_contact_email
      }

      const { error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', user.company_id)

      if (error) throw error

      showToast('Primary contact information updated successfully', 'success')
      fetchCompanyData() // Refresh data
    } catch (error) {
      console.error('Error updating primary contact information:', error)
      showToast('Error updating primary contact information', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Primary Contact</h1>
            <p className="text-gray-600">
              Set up your primary contact person for customer inquiries and business communications.
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Primary Contact Name */}
              <div>
                <label htmlFor="primary_contact_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Contact Name
                </label>
                <input
                  type="text"
                  id="primary_contact_name"
                  name="primary_contact_name"
                  value={formData.primary_contact_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter primary contact person's name"
                />
                <p className="mt-1 text-sm text-gray-500">
                  The main person customers should contact for inquiries.
                </p>
              </div>

              {/* Primary Contact Phone */}
              <div>
                <label htmlFor="primary_contact_phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Contact Phone
                </label>
                <input
                  type="tel"
                  id="primary_contact_phone"
                  name="primary_contact_phone"
                  value={formData.primary_contact_phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter primary contact phone number"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Direct phone number for the primary contact person.
                </p>
              </div>

              {/* Primary Contact Email */}
              <div>
                <label htmlFor="primary_contact_email" className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Contact Email
                </label>
                <input
                  type="email"
                  id="primary_contact_email"
                  name="primary_contact_email"
                  value={formData.primary_contact_email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter primary contact email address"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Email address for the primary contact person.
                </p>
              </div>

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
