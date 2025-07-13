'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Company } from '@/types'
import { useToast } from '@/contexts/ToastContext'
import ImageUpload from '@/components/ImageUpload'
import RouteGuard from '@/components/auth/RouteGuard'
import { useAuth } from '@/contexts/AuthContext'

export default function EditProfile() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState<Company | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const { showToast } = useToast()

  // Profile Editor State
  const [profileData, setProfileData] = useState({
    name: '',
    slogan: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    address: ''
  })

  useEffect(() => {
    if (user?.company_id) {
      fetchCompanyData()
    }
  }, [user])

  const fetchCompanyData = async () => {
    try {
      if (!user?.company_id) return

      // Get company data
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', user.company_id)
        .single()

      if (!companyError && companyData) {
        setCompany(companyData)
        // Initialize profile data
        setProfileData({
          name: companyData.name || '',
          slogan: companyData.slogan || '',
          description: companyData.description || '',
          contact_email: companyData.contact_email || '',
          contact_phone: companyData.contact_phone || '',
          website: companyData.website || '',
          address: companyData.address || ''
        })
      }
    } catch (error) {
      console.error('Error fetching company data:', error)
      showToast('Error loading company data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleProfileSave = async () => {
    if (!company) return
    
    setProfileLoading(true)
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: profileData.name,
          slogan: profileData.slogan || null,
          description: profileData.description || null,
          contact_email: profileData.contact_email || null,
          contact_phone: profileData.contact_phone || null,
          website: profileData.website || null,
          address: profileData.address || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', company.id)

      if (error) throw error

      // Update local company state
      setCompany(prev => prev ? {
        ...prev,
        ...profileData
      } : null)

      showToast('Profile updated successfully!', 'success')
    } catch (error) {
      console.error('Error updating profile:', error)
      showToast('Error updating profile', 'error')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleProfileImageUploaded = async (imageUrl: string) => {
    if (!company) return

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          profile_image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', company.id)

      if (error) throw error

      // Update local company state
      setCompany(prev => prev ? {
        ...prev,
        profile_image_url: imageUrl
      } : null)

      showToast('Profile image updated successfully!', 'success')
    } catch (error) {
      console.error('Error updating profile image:', error)
      showToast('Error updating profile image', 'error')
    }
  }

  const handleProfileImageError = (error: string) => {
    showToast(error, 'error')
  }

  const handleBackToDashboard = () => {
    router.push('/operators/dashboard')
  }

  return (
    <RouteGuard requiredRole="operator" redirectTo="/operators/login">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <button
                  onClick={handleBackToDashboard}
                  className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-xl font-semibold text-gray-900">Edit Public Profile</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : company ? (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Company Information</h2>
                <p className="text-gray-600">Update your company details that will be displayed on your public profile.</p>
              </div>

              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={profileData.name}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="slogan" className="block text-sm font-medium text-gray-700 mb-1">
                      Slogan/Tagline
                    </label>
                    <input
                      type="text"
                      id="slogan"
                      name="slogan"
                      value={profileData.slogan}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Your company tagline"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      id="contact_email"
                      name="contact_email"
                      value={profileData.contact_email}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="contact@company.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      id="contact_phone"
                      name="contact_phone"
                      value={profileData.contact_phone}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      id="website"
                      name="website"
                      value={profileData.website}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://www.company.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={profileData.address}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="123 Main St, City, State 12345"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    About/Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={profileData.description}
                    onChange={handleProfileChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Tell customers about your company, services, and what makes you unique..."
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    onClick={handleBackToDashboard}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProfileSave}
                    disabled={profileLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {profileLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="text-center">
                <p className="text-gray-600">No company data found. Please contact support.</p>
              </div>
            </div>
          )}

          {/* Profile Image Upload */}
          {company && (
            <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Profile Image</h2>
                <p className="text-gray-600">Upload a profile image that will be displayed on your public profile.</p>
              </div>

              <ImageUpload
                currentImageUrl={company.profile_image_url}
                onImageUploaded={handleProfileImageUploaded}
                onUploadError={handleProfileImageError}
                bucketName="profile-images"
                folderPath={`companies/${company.id}`}
              />
            </div>
          )}
        </div>
      </div>
    </RouteGuard>
  )
} 