'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import ImageUpload from '@/components/ImageUpload'

interface PreviewCardEditorProps {
  onSave?: () => void
}

interface OperatorPreviewCardFormData {
  display_name: string
  description: string
  location_name: string
  logo_url: string
}

const limits = {
  display_name: 50,
  description: 200,
  location_name: 100,
  logo_url: 1000 // Add limit for logo_url as well
}

export default function PreviewCardEditor({ onSave }: PreviewCardEditorProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewCard, setPreviewCard] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [formData, setFormData] = useState<OperatorPreviewCardFormData>({
    display_name: '',
    description: '',
    location_name: '',
    logo_url: ''
  })

  useEffect(() => {
    if (user?.company_id) {
      loadPreviewCard()
    }
  }, [user])

  const loadPreviewCard = async () => {
    try {
      if (!user?.company_id) {
        console.error('User has no company_id:', user)
        showToast('No company associated with your account. Please contact support.', 'error')
        return
      }

      // Get the current session
      if (!supabase) {
        console.error('Supabase not configured')
        showToast('Database not configured', 'error')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('No session available')
        showToast('Not authenticated', 'error')
        return
      }

      // Use the server-side API to load the preview card
      const response = await fetch(`/api/load-preview-card`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        
        if (result.company) {
          setCompany(result.company)
        }

        if (result.data) {
          setPreviewCard(result.data)
          setFormData({
            display_name: result.data.display_name || '',
            description: result.data.description || '',
            location_name: result.data.location_name || '',
            logo_url: result.data.logo_url || ''
          })
        } else {
          // Create default preview card
          const defaultData = {
            display_name: result.company?.name || '',
            description: result.company?.description || 'Professional vending services for modern businesses.',
            location_name: (result.company?.location_name || '').substring(0, 100),
            logo_url: result.company?.logo_url || ''
          }
          setFormData(defaultData)
        }

        // Update machine count if needed
        if (result.data && result.data.machine_count === 0) {
          await updateMachineCount()
        }
      } else {
        console.error('Error loading preview card:', response.status)
        showToast('Error loading preview card data', 'error')
      }
    } catch (error) {
      console.error('Error loading preview card:', error)
      showToast('Error loading preview card data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const updateMachineCount = async () => {
    // Skip machine counting for now to avoid database errors
    // This can be implemented later when the database schema is finalized
    console.log('Machine counting temporarily disabled')
    return
  }

  const handleInputChange = (field: keyof OperatorPreviewCardFormData, value: string) => {
    const limit = limits[field as keyof typeof limits]
    if (value.length <= limit) {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      if (!user?.company_id) {
        showToast('No company associated with your account', 'error')
        return
      }

      // Get the current session
      if (!supabase) {
        showToast('Database not configured', 'error')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showToast('Not authenticated', 'error')
        return
      }

      const previewCardData = {
        display_name: formData.display_name,
        description: formData.description,
        location_name: formData.location_name,
        logo_url: formData.logo_url,
        member_since: company?.created_at || new Date().toISOString()
      }

      console.log('Saving preview card data:', previewCardData)

      // Use the server-side API endpoint
      const response = await fetch('/api/save-preview-card-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          previewCardData,
          isUpdate: !!previewCard
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save preview card')
      }

      showToast('Preview card saved successfully!', 'success')
      
      // Reload the preview card data
      await loadPreviewCard()
      
      if (onSave) {
        onSave()
      }
    } catch (error: any) {
      console.error('Error saving preview card:', error)
      
      let errorMessage = 'Error saving preview card'
      if (error?.message) {
        errorMessage = `Error: ${error.message}`
      }
      
      showToast(errorMessage, 'error')
    } finally {
      setSaving(false)
    }
  }

  const getCharacterCount = (field: keyof typeof limits) => {
    return formData[field]?.length || 0
  }

  const getCharacterCountColor = (field: keyof typeof limits) => {
    const count = getCharacterCount(field)
    const limit = limits[field]
    const percentage = (count / limit) * 100
    
    if (percentage >= 90) return 'text-red-500'
    if (percentage >= 75) return 'text-yellow-500'
    return 'text-gray-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Preview Card Editor</h2>
        <p className="text-gray-600">
          Customize how your company appears in featured operator cards across the platform.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Editor Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => handleInputChange('display_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter company name"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>This will be the main title on your card</span>
              <span className={getCharacterCountColor('display_name')}>
                {getCharacterCount('display_name')}/{limits.display_name}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe your vending services and specialties..."
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Brief description of your services</span>
              <span className={getCharacterCountColor('description')}>
                {getCharacterCount('description')}/{limits.description}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location/Area Served
            </label>
            <input
              type="text"
              value={formData.location_name}
              onChange={(e) => handleInputChange('location_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Downtown Business District"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Primary service area or location</span>
              <span className={getCharacterCountColor('location_name')}>
                {getCharacterCount('location_name')}/{limits.location_name}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Logo
            </label>
            <ImageUpload
              currentImageUrl={formData.logo_url}
              onImageUploaded={(url) => handleInputChange('logo_url', url)}
              onUploadError={(error) => {
                showToast(`Image upload failed: ${error}`, 'error')
              }}
              bucketName="company-logos"
              folderPath="logos"
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload your company logo to appear on the card
            </p>
            <p className="text-xs text-gray-500 mt-1">
              <strong>Recommended:</strong> 300x200px, under 2MB, JPG/PNG format
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !formData.display_name || !formData.description || !formData.location_name}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Preview Card'}
          </button>
        </div>

        {/* Live Preview */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Live Preview</h3>
          
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
            <div className="h-48 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              {formData.logo_url && formData.logo_url !== '' ? (
                <img 
                  src={formData.logo_url} 
                  alt={`${formData.display_name} logo`}
                  className="w-24 h-24 object-contain rounded-xl shadow-lg"
                  onError={(e) => {
                    console.warn('Image failed to load:', formData.logo_url)
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              )}
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2 truncate">
                {formData.display_name || 'Company Name'}
              </h3>
              <p className="text-gray-600 mb-4 line-clamp-3">
                {formData.description || 'Professional vending services for modern businesses.'}
              </p>
              <div className="flex items-center text-sm text-gray-500 mb-4">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {formData.location_name || 'Location'}
              </div>
              
              {/* VendHub Network Stats */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-gray-900 mb-3">VendHub Network</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Machines:</span>
                    <span className="font-medium text-gray-900">{previewCard?.machine_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Joined:</span>
                    <span className="font-medium text-gray-900">
                      {previewCard?.member_since ? new Date(previewCard.member_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'January 2024'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-blue-600 hover:text-blue-700 font-medium">
                View Profile →
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Preview Card Features</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Machine count is automatically calculated from your actual machines</li>
              <li>• Member since date is set from your account creation</li>
              <li>• Logo will appear in the header area of the card</li>
              <li>• View Profile link will go to your public company profile</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 