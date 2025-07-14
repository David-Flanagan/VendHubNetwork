'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Company } from '@/types'
import { useToast } from '@/contexts/ToastContext'
import ServiceAreaManager from './ServiceAreaManager'
import { geocodeAddress } from '@/lib/geocoding'
import { loadGoogleMaps } from '@/lib/google-maps-loader'

interface LocationEditorProps {
  company: Company
  onUpdate: (updatedCompany: Company) => void
  showCardWrapper?: boolean
}

export default function LocationEditor({ company, onUpdate, showCardWrapper = true }: LocationEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [showServiceAreas, setShowServiceAreas] = useState(false)
  const [formData, setFormData] = useState({
    address: company.address || '',
    latitude: company.latitude?.toString() || '',
    longitude: company.longitude?.toString() || '',
    map_enabled: company.map_enabled || false
  })
  const { showToast } = useToast()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const numValue = value === '' ? '' : parseFloat(value)
    setFormData(prev => ({
      ...prev,
      [name]: numValue === '' ? '' : numValue
    }))
  }

  const handleMapEnabledChange = async (enabled: boolean) => {
    setFormData(prev => ({ ...prev, map_enabled: enabled }))
    
    // If enabling map and we have an address but no coordinates, auto-geocode
    if (enabled && formData.address && (!formData.latitude || !formData.longitude)) {
      setGeocoding(true)
      try {
        // Load Google Maps if not already loaded
        await loadGoogleMaps()
        
        const result = await geocodeAddress(formData.address)
        if (result.success) {
          setFormData(prev => ({
            ...prev,
            latitude: result.latitude.toString(),
            longitude: result.longitude.toString()
          }))
          showToast('Address automatically converted to coordinates!', 'success')
        } else {
          showToast(`Could not convert address to coordinates: ${result.error}`, 'warning')
        }
      } catch (error) {
        console.error('Geocoding error:', error)
        showToast('Failed to convert address to coordinates. Please enter coordinates manually.', 'error')
      } finally {
        setGeocoding(false)
      }
    }
  }

  const handleSave = async () => {
    // If map is enabled but no coordinates, try to geocode the address
    if (formData.map_enabled && (!formData.latitude || !formData.longitude)) {
      if (formData.address) {
        setGeocoding(true)
        try {
          await loadGoogleMaps()
          const result = await geocodeAddress(formData.address)
          if (result.success) {
            setFormData(prev => ({
              ...prev,
              latitude: result.latitude.toString(),
              longitude: result.longitude.toString()
            }))
            showToast('Address automatically converted to coordinates!', 'success')
          } else {
            showToast('Please provide coordinates or a valid address for map display.', 'error')
            setGeocoding(false)
            return
          }
        } catch (error) {
          console.error('Geocoding error:', error)
          showToast('Please provide coordinates or a valid address for map display.', 'error')
          setGeocoding(false)
          return
        } finally {
          setGeocoding(false)
        }
      } else {
        showToast('Please provide an address or coordinates when map display is enabled.', 'error')
        return
      }
    }

    setLoading(true)
    try {
      const updateData = {
        address: formData.address,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        map_enabled: formData.map_enabled
      }

      const { data, error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', company.id)
        .select()
        .single()

      if (error) throw error

      onUpdate(data)
      setIsEditing(false)
      showToast('Location information updated successfully!', 'success')
    } catch (error) {
      console.error('Error updating location:', error)
      showToast('Failed to update location information. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      address: company.address || '',
      latitude: company.latitude?.toString() || '',
      longitude: company.longitude?.toString() || '',
      map_enabled: company.map_enabled || false
    })
    setIsEditing(false)
  }

  if (!isEditing) {
    const content = (
      <>
        {showCardWrapper && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Location & Service Area</h2>
                <p className="text-gray-600">Manage your warehouse location and service coverage</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowServiceAreas(!showServiceAreas)}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                {showServiceAreas ? 'Hide Service Areas' : 'Manage Service Areas'}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Edit Location
              </button>
            </div>
          </div>
        )}

        {!showCardWrapper && (
          <div className="flex justify-end mb-6 space-x-3">
            <button
              onClick={() => setShowServiceAreas(!showServiceAreas)}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              {showServiceAreas ? 'Hide Service Areas' : 'Manage Service Areas'}
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Edit Location
            </button>
          </div>
        )}

        {/* Service Areas Manager */}
        {showServiceAreas && (
          <div className="mb-6">
            <ServiceAreaManager 
              companyId={company.id} 
              onUpdate={() => {
                // Refresh company data if needed
              }}
            />
          </div>
        )}

        <div className="space-y-4">
          {company.address && (
            <div className="flex items-center p-4 bg-gray-50 rounded-xl">
              <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-gray-700">{company.address}</span>
            </div>
          )}
          
          {company.latitude && company.longitude && (
            <div className="flex items-center p-4 bg-gray-50 rounded-xl">
              <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
              </svg>
              <span className="text-gray-700">
                Coordinates: {company.latitude.toFixed(6)}, {company.longitude.toFixed(6)}
              </span>
            </div>
          )}

          {/* Service areas are now managed through the ServiceAreaManager component */}

          <div className="flex items-center p-4 bg-gray-50 rounded-xl">
            <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-700">
              Map Display: {company.map_enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </>
    )

    if (showCardWrapper) {
      return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {content}
        </div>
      )
    }

    return content
  }

  return (
    <>
      {showCardWrapper && (
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Location & Service Area</h2>
            <p className="text-gray-600">Update your warehouse location and service coverage</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Warehouse Address
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Enter your warehouse address"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Latitude (Optional - will be auto-generated from address)
            </label>
            <input
              type="number"
              name="latitude"
              value={formData.latitude}
              onChange={handleNumberInputChange}
              step="any"
              placeholder="e.g., 40.7128"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Longitude (Optional - will be auto-generated from address)
            </label>
            <input
              type="number"
              name="longitude"
              value={formData.longitude}
              onChange={handleNumberInputChange}
              step="any"
              placeholder="e.g., -74.0060"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-blue-800 font-semibold">Service Areas</span>
          </div>
          <p className="text-blue-700 text-sm">
            Service areas are now managed through the Service Areas Manager above. You can create multiple service areas with different shapes and sizes.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="map_enabled"
              checked={formData.map_enabled}
              onChange={(e) => handleMapEnabledChange(e.target.checked)}
              disabled={geocoding}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
            />
            <label className="ml-2 text-sm font-semibold text-gray-700">
              Show map on company profile page
              {geocoding && <span className="ml-2 text-blue-600">(Converting address...)</span>}
            </label>
          </div>
          
          {formData.map_enabled && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-blue-800 font-semibold">Map Requirements</span>
              </div>
              <p className="text-blue-700 text-sm mb-3">
                To display the map on your profile page, you need latitude and longitude coordinates. 
                These can be automatically generated from your address or entered manually.
              </p>
              
              {formData.address && (!formData.latitude || !formData.longitude) && (
                <button
                  type="button"
                  onClick={async () => {
                    setGeocoding(true)
                    try {
                      await loadGoogleMaps()
                      const result = await geocodeAddress(formData.address)
                      if (result.success) {
                        setFormData(prev => ({
                          ...prev,
                          latitude: result.latitude.toString(),
                          longitude: result.longitude.toString()
                        }))
                        showToast('Address converted to coordinates successfully!', 'success')
                      } else {
                        showToast(`Could not convert address: ${result.error}`, 'warning')
                      }
                    } catch (error) {
                      console.error('Geocoding error:', error)
                      showToast('Failed to convert address. Please enter coordinates manually.', 'error')
                    } finally {
                      setGeocoding(false)
                    }
                  }}
                  disabled={geocoding}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {geocoding ? 'Converting...' : 'Convert Address to Coordinates'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
} 