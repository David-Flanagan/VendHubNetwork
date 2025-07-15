'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Company } from '@/types'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import RouteGuard from '@/components/auth/RouteGuard'
import ImageUpload from '@/components/ImageUpload'

type SettingsSection = 'company-info' | 'business-credentials' | 'location-service' | 'notifications' | 'billing' | 'privacy' | 'integrations' | 'commission-settings'

export default function CompanySettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [activeSection, setActiveSection] = useState<SettingsSection>('company-info')
  const { showToast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    // Company Info
    name: '',
    description: '',
    slogan: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    
    // Business Credentials
    incorporated_date: '',
    logo_url: '',
    
    // Location & Service Area
    map_enabled: false,
    latitude: '',
    longitude: '',
    
    // Commission Settings
    processing_fee_percentage: '',
    sales_tax_percentage: ''
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
          // Company Info
          name: companyData.name || '',
          description: companyData.description || '',
          slogan: companyData.slogan || '',
          contact_email: companyData.contact_email || '',
          contact_phone: companyData.contact_phone || '',
          website: companyData.website || '',
          
          // Business Credentials
          incorporated_date: companyData.incorporated_date || '',
          logo_url: companyData.logo_url || '',
          
          // Location & Service Area
          map_enabled: companyData.map_enabled || false,
          latitude: companyData.latitude?.toString() || '',
          longitude: companyData.longitude?.toString() || '',
          
          // Commission Settings
          processing_fee_percentage: companyData.processing_fee_percentage?.toString() || '',
          sales_tax_percentage: companyData.sales_tax_percentage?.toString() || ''
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

      const updateData: any = {
        // Company Info
        name: formData.name,
        description: formData.description,
        slogan: formData.slogan,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        website: formData.website,
        
        // Business Credentials
        incorporated_date: formData.incorporated_date || null,
        logo_url: formData.logo_url || null,
        
        // Location & Service Area
        map_enabled: formData.map_enabled,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        
        // Commission Settings
        processing_fee_percentage: formData.processing_fee_percentage ? parseFloat(formData.processing_fee_percentage) : null,
        sales_tax_percentage: formData.sales_tax_percentage ? parseFloat(formData.sales_tax_percentage) : null
      }

      const { error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', user.company_id)

      if (error) throw error

      showToast('Company settings updated successfully', 'success')
      fetchCompanyData() // Refresh data
    } catch (error) {
      console.error('Error updating company settings:', error)
      showToast('Error updating company settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleLogoUpload = (imageUrl: string) => {
    setFormData(prev => ({
      ...prev,
      logo_url: imageUrl
    }))
    showToast('Logo uploaded successfully', 'success')
  }

  const handleLogoUploadError = (error: string) => {
    showToast(`Logo upload failed: ${error}`, 'error')
  }

  const getSectionIcon = (section: SettingsSection) => {
    switch (section) {
      case 'company-info':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      case 'business-credentials':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'location-service':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      case 'notifications':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.19 4.19A2 2 0 004 5v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-1.81 1.19z" />
          </svg>
        )
      case 'billing':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        )
      case 'privacy':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      case 'integrations':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      case 'commission-settings':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        )
    }
  }

  const getSectionTitle = (section: SettingsSection) => {
    switch (section) {
      case 'company-info': return 'Company Information'
      case 'business-credentials': return 'Business Credentials'
      case 'location-service': return 'Location & Service Area'
      case 'notifications': return 'Notification Preferences'
      case 'billing': return 'Billing & Payment'
      case 'privacy': return 'Privacy & Visibility'
      case 'integrations': return 'API Keys & Integrations'
      case 'commission-settings': return 'Commission Settings'
    }
  }

  const renderCompanyInfoSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your company tagline"
            />
          </div>
        </div>
      </div>

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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Describe your company and services..."
        />
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="contact@company.com"
            />
          </div>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
        <div className="mt-6">
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
            Website
          </label>
          <input
            type="url"
            id="website"
            name="website"
            value={formData.website}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://www.company.com"
          />
        </div>
      </div>
    </div>
  )

  const renderBusinessCredentialsSection = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Company Logo
        </label>
        <ImageUpload
          currentImageUrl={formData.logo_url}
          onImageUploaded={handleLogoUpload}
          onUploadError={handleLogoUploadError}
          bucketName="company-logos"
          folderPath="logos"
          maxSizeMB={2}
          acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
          aspectRatio={1}
          className="max-w-xs"
        />
        <p className="mt-1 text-xs text-gray-500">
          Upload your company logo. Recommended size: 200x200px, square format.
        </p>
      </div>

      <div>
        <label htmlFor="incorporated_date" className="block text-sm font-medium text-gray-700 mb-2">
          Incorporation Date
        </label>
        <input
          type="date"
          id="incorporated_date"
          name="incorporated_date"
          value={formData.incorporated_date}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          The date your company was officially incorporated
        </p>
      </div>
    </div>
  )

  const renderLocationServiceSection = () => (
    <div className="space-y-6">
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
      <p className="text-xs text-gray-500 ml-6">
        When enabled, customers can find your company through location-based search
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            placeholder="40.7128"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
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
            placeholder="-74.0060"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Set your company's location coordinates. This helps customers find you through location-based search.
      </p>
    </div>
  )

  const renderCommissionSettingsSection = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Commission Settings</h4>
        <p className="text-sm text-blue-700">
          These settings are used to calculate final product prices during customer onboarding. 
          The processing fee and sales tax percentages will be applied to commission amounts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="processing_fee_percentage" className="block text-sm font-medium text-gray-700 mb-2">
            Processing Fee Percentage *
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              id="processing_fee_percentage"
              name="processing_fee_percentage"
              value={formData.processing_fee_percentage}
              onChange={handleInputChange}
              placeholder="2.90"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-gray-500 text-sm">%</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Processing fee percentage applied to commission amounts (e.g., 2.90 for 2.90%)
          </p>
        </div>

        <div>
          <label htmlFor="sales_tax_percentage" className="block text-sm font-medium text-gray-700 mb-2">
            Sales Tax Percentage *
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              id="sales_tax_percentage"
              name="sales_tax_percentage"
              value={formData.sales_tax_percentage}
              onChange={handleInputChange}
              placeholder="8.25"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-gray-500 text-sm">%</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Sales tax percentage applied to commission amounts (e.g., 8.25 for 8.25%)
          </p>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Price Calculation Example</h4>
        <p className="text-sm text-gray-600 mb-2">
          For a product with a base price of $2.00 and 15% commission:
        </p>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• Base Price: $2.00</div>
          <div>• Commission (15%): +$0.30</div>
          <div>• Processing Fee (2.90% of commission): +$0.01</div>
          <div>• Sales Tax (8.25% of commission): +$0.02</div>
          <div className="font-medium">• Final Price: $2.33 (rounded up to nearest quarter)</div>
        </div>
      </div>
    </div>
  )

  const renderFutureSection = (section: SettingsSection) => (
    <div className="space-y-6">
      <div className="bg-gray-50 p-6 rounded-lg border">
        <div className="flex items-center mb-4">
          {getSectionIcon(section)}
          <h3 className="text-lg font-medium text-gray-900 ml-3">{getSectionTitle(section)}</h3>
        </div>
        <p className="text-gray-600 mb-4">
          This section is coming soon! We're working on implementing {getSectionTitle(section).toLowerCase()} functionality.
        </p>
        <div className="bg-white p-4 rounded-md border">
          <p className="text-sm text-gray-600">
            Planned features for this section:
          </p>
          <ul className="mt-2 text-sm text-gray-600 space-y-1">
            {section === 'notifications' && (
              <>
                <li>• Email notification preferences</li>
                <li>• SMS alerts for new inquiries</li>
                <li>• Dashboard notification settings</li>
                <li>• Marketing communication preferences</li>
              </>
            )}
            {section === 'billing' && (
              <>
                <li>• Payment method management</li>
                <li>• Billing history and invoices</li>
                <li>• Subscription plan management</li>
                <li>• Tax information and settings</li>
              </>
            )}
            {section === 'privacy' && (
              <>
                <li>• Profile visibility controls</li>
                <li>• Data sharing preferences</li>
                <li>• Account privacy settings</li>
                <li>• GDPR compliance options</li>
              </>
            )}
            {section === 'integrations' && (
              <>
                <li>• API key management</li>
                <li>• Third-party integrations</li>
                <li>• Webhook configurations</li>
                <li>• Data export settings</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  )

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'company-info':
        return renderCompanyInfoSection()
      case 'business-credentials':
        return renderBusinessCredentialsSection()
      case 'location-service':
        return renderLocationServiceSection()
      case 'commission-settings':
        return renderCommissionSettingsSection()
      case 'notifications':
      case 'billing':
      case 'privacy':
      case 'integrations':
        return renderFutureSection(activeSection)
      default:
        return renderCompanyInfoSection()
    }
  }

  if (loading) {
    return (
      <RouteGuard requiredRole="operator" redirectTo="/operators/login">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard requiredRole="operator" redirectTo="/operators/login">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">Company Settings</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Settings</h2>
                </div>
                <nav className="p-2">
                  <ul className="space-y-1">
                    {([
                      'company-info',
                      'business-credentials', 
                      'location-service',
                      'commission-settings',
                      'notifications',
                      'billing',
                      'privacy',
                      'integrations'
                    ] as SettingsSection[]).map((section) => (
                      <li key={section}>
                        <button
                          onClick={() => setActiveSection(section)}
                          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            activeSection === section
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          {getSectionIcon(section)}
                          <span className="ml-3">{getSectionTitle(section)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1">
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">{getSectionTitle(activeSection)}</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Manage your company's {getSectionTitle(activeSection).toLowerCase()} settings.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                  {renderActiveSection()}

                  {/* Submit Button - Only show for sections with actual forms */}
                  {!['notifications', 'billing', 'privacy', 'integrations'].includes(activeSection) && (
                    <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  )
} 