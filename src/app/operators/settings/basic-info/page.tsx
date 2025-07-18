'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Company } from '@/types'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import RouteGuard from '@/components/auth/RouteGuard'

export default function BasicInfoSettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const { showToast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slogan: '',
    contact_email: '',
    contact_phone: '',
    website: ''
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
          name: companyData.name || '',
          description: companyData.description || '',
          slogan: companyData.slogan || '',
          contact_email: companyData.contact_email || '',
          contact_phone: companyData.contact_phone || '',
          website: companyData.website || ''
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
        name: formData.name,
        description: formData.description,
        slogan: formData.slogan,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        website: formData.website
      }

      const { error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', user.company_id)

      if (error) throw error

      showToast('Basic information updated successfully', 'success')
      fetchCompanyData() // Refresh data
    } catch (error) {
      console.error('Error updating basic information:', error)
      showToast('Error updating basic information', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Basic Information</h1>
            <p className="text-gray-600">
              Update your company's basic information and contact details.
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your company name"
                />
              </div>

              {/* Company Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe your company and services"
                />
              </div>

              {/* Company Slogan */}
              <div>
                <label htmlFor="slogan" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Slogan
                </label>
                <input
                  type="text"
                  id="slogan"
                  name="slogan"
                  value={formData.slogan}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your company slogan or tagline"
                />
              </div>

              {/* Contact Email */}
              <div>
                <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email
                </label>
                <input
                  type="email"
                  id="contact_email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter contact email address"
                />
              </div>

              {/* Contact Phone */}
              <div>
                <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  id="contact_phone"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter contact phone number"
                />
              </div>

              {/* Website */}
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your company website URL"
                />
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
