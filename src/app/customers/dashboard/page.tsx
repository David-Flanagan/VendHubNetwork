'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'
import { Customer, CustomerFormData, EmployeeCountRange, Company } from '@/types'
import { geocodeAddress } from '@/lib/geocoding'
import { loadGoogleMaps, getGoogleMaps } from '@/lib/google-maps-loader'
import CustomerMap from '@/components/maps/CustomerMap'

export default function CustomerDashboard() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<CustomerFormData>({
    business_name: '',
    business_type: '',
    employee_count_range: undefined,
    address: '',
    latitude: undefined,
    longitude: undefined
  })
  const [nearbyCompanies, setNearbyCompanies] = useState<Company[]>([])
  const [mapLoading, setMapLoading] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const router = useRouter()
  const { showToast } = useToast()

  // Load customer data
  useEffect(() => {
    const loadCustomerData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/customers/login')
          return
        }

        // Skip role check for now to avoid RLS issues
        // TODO: Re-enable role checking once RLS policies are properly configured

        // Load customer profile
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (customerError) {
          if (customerError.code === 'PGRST116') {
            // Customer profile doesn't exist yet - this is normal for new customers
            console.log('No customer profile found - user needs to create one')
          } else {
            // This is an actual error
            console.error('Error loading customer data:', customerError)
            showToast('Error loading customer data', 'error')
          }
        }

        if (customerData) {
          setCustomer(customerData)
          setFormData({
            business_name: customerData.business_name,
            business_type: customerData.business_type || '',
            employee_count_range: customerData.employee_count_range,
            address: customerData.address,
            latitude: customerData.latitude,
            longitude: customerData.longitude
          })
        }
      } catch (error) {
        console.error('Error loading customer data:', error)
        showToast('Error loading customer data', 'error')
      } finally {
        setLoading(false)
      }
    }

    loadCustomerData()
  }, [router]) // Removed showToast from dependencies to prevent infinite loop

  // Handle URL parameters for returning from company profile
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const locationParam = urlParams.get('location')
    
    if (locationParam && customer && customer.latitude && customer.longitude) {
      // User returned from a company profile, automatically search for companies
      findNearbyCompanies(customer.latitude, customer.longitude)
    }
  }, [customer])

  const handleGeocode = async () => {
    if (!formData.address.trim()) {
      showToast('Please enter an address first', 'error')
      return
    }

    try {
      const coordinates = await geocodeAddress(formData.address)
      if (coordinates.success) {
        setFormData(prev => ({
          ...prev,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude
        }))
        showToast('Address geocoded successfully!', 'success')
        // Find nearby companies after geocoding
        await findNearbyCompanies(coordinates.latitude, coordinates.longitude)
      } else {
        throw new Error(coordinates.error || 'Geocoding failed')
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      showToast('Error geocoding address. Please check the address and try again.', 'error')
    }
  }

  const findNearbyCompanies = async (lat: number, lng: number) => {
    try {
      console.log('Searching for companies near:', lat, lng)
      
      // First, get all companies with their service areas
      const { data: companies, error } = await supabase
        .from('companies')
        .select(`
          *,
          service_areas (*)
        `)
        .eq('map_enabled', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      if (error) {
        console.error('Error loading companies:', error)
        return
      }

      console.log('Total companies found:', companies?.length || 0)
      console.log('Companies:', companies)

      // Filter companies that serve the customer's location
      const nearbyCompanies = companies.filter(company => {
        console.log('Checking company:', company.name, 'at', company.latitude, company.longitude)
        
        // Check if company has service areas
        if (company.service_areas && company.service_areas.length > 0) {
          console.log('Company has service areas:', company.service_areas.length)
          return company.service_areas.some((area: any) => {
            if (area.method === 'radius' && area.center_lat && area.center_lng && area.radius_meters) {
              // Calculate distance from customer to service area center
              console.log('Service area center:', area.center_lat, area.center_lng)
              const distance = calculateDistance(lat, lng, area.center_lat, area.center_lng)
              const radiusInMiles = area.radius_meters / 1609.34 // Convert meters to miles
              console.log('Radius area - distance:', distance, 'miles, radius:', radiusInMiles, 'miles')
              return distance <= radiusInMiles
            } else if (area.method === 'polygon' && area.polygon_geometry) {
              // For polygon areas, check if point is inside polygon
              // GeoJSON stores coordinates as [lng, lat], but our function expects [lat, lng]
              // So we need to swap the coordinates
              const swappedPolygon = area.polygon_geometry.coordinates[0].map((coord: number[]) => [coord[1], coord[0]])
              const inside = isPointInPolygon(lat, lng, swappedPolygon)
              console.log('Polygon area - inside:', inside)
              return inside
            }
            return false
          })
        }
        
        // Fallback: check if customer is within company's service radius
        if (company.service_area_radius_miles) {
          const distance = calculateDistance(lat, lng, company.latitude, company.longitude)
          console.log('Fallback - distance:', distance, 'miles, service radius:', company.service_area_radius_miles, 'miles')
          return distance <= company.service_area_radius_miles
        }
        
        console.log('Company has no service areas or radius')
        return false
      })

      // Sort by distance
      nearbyCompanies.sort((a, b) => {
        const distanceA = calculateDistance(lat, lng, a.latitude, a.longitude)
        const distanceB = calculateDistance(lat, lng, b.latitude, b.longitude)
        return distanceA - distanceB
      })

      setNearbyCompanies(nearbyCompanies)
      showToast(`Found ${nearbyCompanies.length} nearby vending companies!`, 'success')
    } catch (error) {
      console.error('Error finding nearby companies:', error)
      showToast('Error finding nearby companies', 'error')
    }
  }

  // Calculate distance between two points using Haversine formula (returns miles)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c
    
    console.log(`Distance calculation: (${lat1}, ${lng1}) to (${lat2}, ${lng2}) = ${distance} miles`)
    return distance
  }

  // Check if point is inside polygon using ray casting algorithm
  const isPointInPolygon = (lat: number, lng: number, polygon: number[][]): boolean => {
    console.log('Checking polygon for point:', lat, lng)
    console.log('Polygon coordinates:', polygon)
    
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1]
      const xj = polygon[j][0], yj = polygon[j][1]
      
      console.log(`Edge ${i}: (${xi}, ${yi}) to (${xj}, ${yj})`)
      
      if (((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)) {
        inside = !inside
        console.log('Ray intersects edge, inside =', inside)
      }
    }
    
    console.log('Final result: point is', inside ? 'INSIDE' : 'OUTSIDE', 'polygon')
    return inside
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        showToast('User not authenticated', 'error')
        return
      }

      const customerData = {
        user_id: user.id,
        business_name: formData.business_name,
        business_type: formData.business_type || null,
        employee_count_range: formData.employee_count_range || null,
        address: formData.address,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null
      }

      if (customer) {
        // Update existing customer
        const { data, error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', customer.id)
          .select()
          .single()

        if (error) throw error
        setCustomer(data)
        showToast('Profile updated successfully!', 'success')
      } else {
        // Create new customer
        const { data, error } = await supabase
          .from('customers')
          .insert(customerData)
          .select()
          .single()

        if (error) throw error
        setCustomer(data)
        showToast('Profile created successfully!', 'success')
        
        // Find nearby companies if coordinates are available
        if (formData.latitude && formData.longitude) {
          await findNearbyCompanies(formData.latitude, formData.longitude)
        }
      }
    } catch (error: any) {
      console.error('Error saving customer data:', error)
      showToast(error.message || 'Error saving profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/customers/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Dashboard</h1>
              <p className="text-sm text-gray-600">Find vending equipment for your business</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Location Input Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              {customer ? 'Update Your Business Information' : 'Tell Us About Your Business'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.business_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your business name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Type
                </label>
                <input
                  type="text"
                  value={formData.business_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Office, Restaurant, Gym, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Employees
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['1-10', '11-50', '51-200', '200+'] as EmployeeCountRange[]).map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, employee_count_range: range }))}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        formData.employee_count_range === range
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Address *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your business address"
                  />
                  <button
                    type="button"
                    onClick={handleGeocode}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Geocode
                  </button>
                </div>
                {formData.latitude && formData.longitude && (
                  <p className="mt-1 text-sm text-green-600">
                    ✓ Coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : (customer ? 'Update Profile' : 'Save Profile')}
              </button>

              {/* Find Companies Button */}
              {customer && customer.latitude && customer.longitude && (
                <button
                  type="button"
                  onClick={() => findNearbyCompanies(customer.latitude!, customer.longitude!)}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                >
                  Find Nearby Companies
                </button>
              )}
            </form>
          </div>

          {/* Map and Nearby Companies */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Nearby Vending Companies</h2>
            
            {customer && customer.latitude && customer.longitude ? (
              <div className="space-y-4">
                {/* Map */}
                <CustomerMap
                  customerLat={customer.latitude!}
                  customerLng={customer.longitude!}
                  nearbyCompanies={nearbyCompanies}
                  onCompanyClick={(company: Company) => {
                    const searchUrl = `/${encodeURIComponent(company.name)}?from=search&location=${encodeURIComponent(formData.address)}`
                    window.open(searchUrl, '_blank')
                  }}
                />

                {/* Company Cards */}
                {nearbyCompanies.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Found {nearbyCompanies.length} compan{nearbyCompanies.length !== 1 ? 'ies' : 'y'} serving your area:
                    </p>
                    {nearbyCompanies.map((company, index) => {
                      const distance = calculateDistance(
                        customer.latitude!, 
                        customer.longitude!, 
                        company.latitude!, 
                        company.longitude!
                      )
                      return (
                        <div key={company.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{company.name}</h3>
                              {company.slogan && (
                                <p className="text-sm text-gray-600 mt-1">{company.slogan}</p>
                              )}
                              <div className="flex items-center mt-2 text-sm text-gray-500">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {distance.toFixed(1)} miles away
                              </div>
                            </div>
                            <a
                              href={`/${encodeURIComponent(company.name)}?from=search&location=${encodeURIComponent(formData.address)}`}
                              className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 transition-colors"
                            >
                              View Profile
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
                    </svg>
                    <p className="text-lg font-medium">No companies found</p>
                    <p className="text-sm">No vending companies currently serve your area</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-lg font-medium">Enter Your Address</p>
                  <p className="text-sm">Fill out the form and geocode your address to see nearby vending companies</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 