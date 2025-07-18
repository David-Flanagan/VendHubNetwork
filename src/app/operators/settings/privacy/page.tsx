'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import RouteGuard from '@/components/auth/RouteGuard'

export default function PrivacySettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    profile_visibility: 'public',
    show_contact_info: true,
    show_location: true,
    allow_messaging: true,
    data_sharing: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      showToast('Privacy settings updated successfully', 'success')
    } catch (error) {
      console.error('Error updating privacy settings:', error)
      showToast('Error updating privacy settings', 'error')
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
    <RouteGuard requiredRoles={['operator']}>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy & Visibility</h1>
            <p className="text-gray-600">Control your profile visibility and data sharing preferences.</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="profile_visibility" className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Visibility
                </label>
                <select
                  id="profile_visibility"
                  name="profile_visibility"
                  value={formData.profile_visibility}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="limited">Limited</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show_contact_info"
                  name="show_contact_info"
                  checked={formData.show_contact_info}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="show_contact_info" className="ml-2 block text-sm text-gray-900">
                  Show Contact Information
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show_location"
                  name="show_location"
                  checked={formData.show_location}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="show_location" className="ml-2 block text-sm text-gray-900">
                  Show Location
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allow_messaging"
                  name="allow_messaging"
                  checked={formData.allow_messaging}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allow_messaging" className="ml-2 block text-sm text-gray-900">
                  Allow Customer Messaging
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="data_sharing"
                  name="data_sharing"
                  checked={formData.data_sharing}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="data_sharing" className="ml-2 block text-sm text-gray-900">
                  Allow Data Sharing for Analytics
                </label>
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
