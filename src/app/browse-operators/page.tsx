'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Company } from '@/types'
import { geocodeAddress } from '@/lib/geocoding'
import { useToast } from '@/contexts/ToastContext'
import CustomerMap from '@/components/maps/CustomerMap'

export default function BrowseOperatorsPage() {
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  
  // All operators (for bottom section)
  const [operators, setOperators] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Location-based search (for top section)
  const [locationSearch, setLocationSearch] = useState('')
  const [locationCoords, setLocationCoords] = useState<{lat: number, lng: number} | null>(null)
  const [nearbyCompanies, setNearbyCompanies] = useState<Company[]>([])
  const [locationLoading, setLocationLoading] = useState(false)
  const [showLocationResults, setShowLocationResults] = useState(false)

  useEffect(() => {
    fetchOperators()
  }, [])

  // Handle URL parameters for returning from company profile
  useEffect(() => {
    const locationParam = searchParams.get('location')
    
    if (locationParam) {
      setLocationSearch(locationParam)
      // Auto-trigger search if we have coordinates
      if (locationCoords) {
        findNearbyCompanies(locationCoords.lat, locationCoords.lng)
      }
    }
  }, [searchParams, locationCoords])

  const fetchOperators = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name')

      if (error) throw error
      setOperators(data || [])
    } catch (error) {
      console.error('Error fetching operators:', error)
    } finally {
      setLoading(false)
    }
  }

  // Location-based search functions
  const handleGeocode = async () => {
    if (!locationSearch.trim()) {
      showToast('Please enter an address first', 'error')
      return
    }

    try {
      setLocationLoading(true)
      const coordinates = await geocodeAddress(locationSearch)
      if (coordinates.success) {
        setLocationCoords({
          lat: coordinates.latitude,
          lng: coordinates.longitude
        })
        showToast('Address geocoded successfully!', 'success')
        await findNearbyCompanies(coordinates.latitude, coordinates.longitude)
      } else {
        throw new Error(coordinates.error || 'Geocoding failed')
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      showToast('Error geocoding address. Please check the address and try again.', 'error')
    } finally {
      setLocationLoading(false)
    }
  }

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error')
      return
    }

    try {
      setLocationLoading(true)
      showToast('Getting your current location...', 'info')
      
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        })
      })

      const { latitude, longitude } = position.coords
      
      setLocationCoords({
        lat: latitude,
        lng: longitude
      })
      
      // Set a placeholder for the location search
      setLocationSearch('Current Location')
      
      showToast('Location found! Searching for nearby operators...', 'success')
      await findNearbyCompanies(latitude, longitude)
    } catch (error) {
      console.error('Geolocation error:', error)
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            showToast('Location access denied. Please allow location access or enter your address manually.', 'error')
            break
          case error.POSITION_UNAVAILABLE:
            showToast('Location information unavailable. Please enter your address manually.', 'error')
            break
          case error.TIMEOUT:
            showToast('Location request timed out. Please try again or enter your address manually.', 'error')
            break
          default:
            showToast('Error getting your location. Please enter your address manually.', 'error')
        }
      } else {
        showToast('Error getting your location. Please enter your address manually.', 'error')
      }
    } finally {
      setLocationLoading(false)
    }
  }

  const findNearbyCompanies = async (lat: number, lng: number) => {
    try {
      console.log('Searching for companies near:', lat, lng)
      
      // First, let's get ALL companies to see what we're working with
      const { data: allCompanies, error: allError } = await supabase
        .from('companies')
        .select('*')
        .order('name')

      if (allError) {
        console.error('Error loading all companies:', allError)
        return
      }

      console.log('All companies found:', allCompanies?.length || 0)
      console.log('Sample companies:', allCompanies?.slice(0, 3))

      // Get companies with their service areas and additional stats
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
        console.error('Error loading companies with service areas:', error)
        return
      }

      console.log('Companies with map_enabled=true and coordinates:', companies?.length || 0)
      console.log('Companies with service areas:', companies?.filter(c => c.service_areas && c.service_areas.length > 0).length || 0)

      // For now, let's show ALL companies with coordinates as a fallback
      // This will help us see if the issue is with service areas or the filtering logic
      let nearbyCompanies = companies || []

      // If we have companies with service areas, try the original filtering logic
      if (companies && companies.length > 0) {
                const companiesWithServiceAreas = companies.filter(company => {
          // Check if company has service areas
          if (company.service_areas && company.service_areas.length > 0) {
            return company.service_areas.some((area: any) => {
              if (area.method === 'polygon' && area.polygon_geometry) {
                const swappedPolygon = area.polygon_geometry.coordinates[0].map((coord: number[]) => [coord[1], coord[0]])
                return isPointInPolygon(lat, lng, swappedPolygon)
              }
              return false
            })
          }
          
          return false
        })

        console.log('Companies matching service areas:', companiesWithServiceAreas.length)
        
        // If we found companies with service areas, use them
        if (companiesWithServiceAreas.length > 0) {
          nearbyCompanies = companiesWithServiceAreas
        } else {
          console.log('No companies found with service areas, showing all companies with coordinates')
        }
      }

      // Sort by distance
      nearbyCompanies.sort((a, b) => {
        const distanceA = calculateDistance(lat, lng, a.latitude, a.longitude)
        const distanceB = calculateDistance(lat, lng, b.latitude, b.longitude)
        return distanceA - distanceB
      })

      console.log('Final nearby companies:', nearbyCompanies.length)
      setNearbyCompanies(nearbyCompanies)
      setShowLocationResults(true)
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
    return R * c
  }

  // Check if point is inside polygon
  const isPointInPolygon = (lat: number, lng: number, polygon: number[][]): boolean => {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1]
      const xj = polygon[j][0], yj = polygon[j][1]
      
      if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
        inside = !inside
      }
    }
    return inside
  }

  const filteredOperators = operators.filter(operator =>
    operator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (operator.description && operator.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <h1 className="text-3xl font-bold text-gray-900">Vending Operators</h1>
            <p className="mt-2 text-gray-600">
              Find operators in your area or browse all available companies
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Section 1: Location-Based Search */}
        <div className="mb-12">
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Find Operators Near You</h2>
            <p className="text-gray-600 mb-6">
              Enter your business address to find vending operators that serve your area
            </p>
            
            {/* Location Input */}
            <div className="flex space-x-2 mb-6">
              <input
                type="text"
                placeholder="Enter your business address..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleGeocode}
                disabled={locationLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {locationLoading ? 'Searching...' : 'Find Operators'}
              </button>
              <button
                onClick={handleUseCurrentLocation}
                disabled={locationLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                title="Use your current location"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Current Location</span>
              </button>
            </div>

            {/* Location Results */}
            {showLocationResults && locationCoords && (
              <div className="space-y-6">
                {/* Map */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Interactive Map</h3>
                  <CustomerMap
                    customerLat={locationCoords.lat}
                    customerLng={locationCoords.lng}
                    nearbyCompanies={nearbyCompanies}
                    onCompanyClick={(company: Company) => {
                      const searchUrl = `/${encodeURIComponent(company.name)}?from=search&location=${encodeURIComponent(locationSearch)}`
                      window.open(searchUrl, '_blank')
                    }}
                  />
                </div>

                {/* Company Cards */}
                {nearbyCompanies.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Found {nearbyCompanies.length} compan{nearbyCompanies.length !== 1 ? 'ies' : 'y'} serving your area:
                    </h3>
                    <div className="space-y-4">
                      {nearbyCompanies.map((company) => {
                        const distance = calculateDistance(
                          locationCoords.lat, 
                          locationCoords.lng, 
                          company.latitude!, 
                          company.longitude!
                        )
                        
                        // Format dates
                        const createdDate = new Date(company.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long'
                        })
                        
                        const incorporatedDate = company.incorporated_date 
                          ? new Date(company.incorporated_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long'
                            })
                          : 'Not specified'
                        
                        return (
                          <div
                            key={company.id}
                            className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="p-6">
                              <div className="flex items-start space-x-4">
                                {/* Logo Space */}
                                <div className="flex-shrink-0">
                                  {company.logo_url ? (
                                    <img 
                                      src={company.logo_url} 
                                      alt={`${company.name} logo`}
                                      className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                      <span className="text-white font-bold text-lg">
                                        {company.name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Company Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h4 className="text-xl font-semibold text-gray-900 mb-1">
                                        {company.name}
                                      </h4>
                                      {company.slogan && (
                                        <p className="text-sm text-gray-600 mb-3 italic">"{company.slogan}"</p>
                                      )}

                                    </div>
                                    
                                    {/* Distance Badge */}
                                    <div className="flex-shrink-0 ml-4">
                                      <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                        {distance.toFixed(1)} miles
                                      </div>
                                    </div>
                                  </div>

                                  {/* Credentials Grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 font-medium">Active Machines</p>
                                        <p className="text-sm font-semibold text-gray-900">In Network</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 font-medium">VendHub Operator</p>
                                        <p className="text-sm font-semibold text-gray-900">Since {createdDate}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 font-medium">Incorporated</p>
                                        <p className="text-sm font-semibold text-gray-900">{incorporatedDate}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Contact Info */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                                      {company.contact_email && (
                                        <div className="flex items-center space-x-1">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                          </svg>
                                          <span>{company.contact_email}</span>
                                        </div>
                                      )}
                                      {company.contact_phone && (
                                        <div className="flex items-center space-x-1">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                          </svg>
                                          <span>{company.contact_phone}</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex items-center space-x-3">
                                      <a
                                        href={`/${encodeURIComponent(company.name)}?from=search&location=${encodeURIComponent(locationSearch)}`}
                                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                                      >
                                        View Profile
                                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                      </a>
                                      
                                      <button
                                        onClick={() => {
                                          // TODO: Implement onboarding flow
                                          showToast('Onboarding feature coming soon!', 'info')
                                        }}
                                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                                      >
                                        Start Onboarding
                                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No operators found serving your area</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Browse All Operators */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Browse All Operators</h2>
          <p className="text-gray-600 mb-6">
            Explore all vending machine operators in our network
          </p>
          
          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search operators by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Operators Grid */}
          {filteredOperators.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOperators.map((operator) => (
                <a
                  key={operator.id}
                  href={`/${encodeURIComponent(operator.name)}`}
                  className="block bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {operator.name}
                  </h3>
                  {operator.slogan && (
                    <p className="text-sm text-gray-600 italic mb-3">
                      {operator.slogan}
                    </p>
                  )}
                  {operator.description && (
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {operator.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {operator.contact_email && (
                        <div className="flex items-center mb-1">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {operator.contact_email}
                        </div>
                      )}
                      {operator.contact_phone && (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {operator.contact_phone}
                        </div>
                      )}
                    </div>
                    <div className="text-blue-600 font-medium">
                      View Profile →
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                {searchTerm ? 'No operators found matching your search.' : 'No operators available at the moment.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 