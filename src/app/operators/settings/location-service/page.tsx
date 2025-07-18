'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Company } from '@/types'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import RouteGuard from '@/components/auth/RouteGuard'

export default function LocationServiceSettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const { showToast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    map_enabled: false,
    latitude: '',
    longitude: ''
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
          map_enabled: companyData.map_enabled || false,
          latitude: companyData.latitude?.toString() || '',
          longitude: companyData.longitude?.toString() || ''
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
        map_enabled: formData.map_enabled,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null
      }

      const { error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', user.company_id)

      if (error) throw error

      showToast('Location and service settings updated successfully', 'success')
      fetchCompanyData() // Refresh data
    } catch (error) {
      console.error('Error updating location and service settings:', error)
      showToast('Error updating location and service settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Location & Service Area</h1>
            <p className="text-gray-600">
              Manage your company's location and service area settings.
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Enable Location-based Search */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="map_enabled"
                  name="map_enabled"
                  checked={formData.map_enabled}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="map_enabled" className="ml-2 block text-sm text-gray-900">
                  Enable location-based search
                </label>
              </div>
              <p className="text-sm text-gray-500">
                When enabled, customers can find your company through location-based search.
              </p>

              {/* Latitude */}
              <div>
                <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  id="latitude"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter latitude coordinate"
                />
              </div>

              {/* Longitude */}
              <div>
                <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  id="longitude"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter longitude coordinate"
                />
              </div>

              <p className="text-sm text-gray-500">
                Set your company's location coordinates. This helps customers find you through location-based search.
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
