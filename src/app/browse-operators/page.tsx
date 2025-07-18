'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Company } from '@/types'
import { geocodeAddress } from '@/lib/geocoding'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import CustomerMap from '@/components/maps/CustomerMap'

function BrowseOperatorsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
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
  
  // Machine templates for companies
  const [companyTemplates, setCompanyTemplates] = useState<{[key: string]: any[]}>({})

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
      
      // Load machine templates for all companies
      await loadCompanyTemplates(data || [])
    } catch (error) {
      console.error('Error fetching operators:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCompanyTemplates = async (companies: Company[]) => {
    try {
      const companyIds = companies.map(c => c.id)
      
      const { data: templates, error } = await supabase
        .from('company_machine_templates')
        .select(`
          id,
          name,
          company_id,
          slot_count,
          is_active
        `)
        .in('company_id', companyIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading company templates:', error)
        return
      }

      console.log('Loaded company templates:', templates)

      // Group templates by company_id
      const templatesByCompany: {[key: string]: any[]} = {}
      templates?.forEach(template => {
        if (!templatesByCompany[template.company_id]) {
          templatesByCompany[template.company_id] = []
        }
        templatesByCompany[template.company_id].push({
          id: template.id,
          name: template.name,
          slot_count: template.slot_count
        })
      })

      console.log('Templates by company:', templatesByCompany)
      setCompanyTemplates(templatesByCompany)
    } catch (error) {
      console.error('Error loading company templates:', error)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Find{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600">
                Vending Operators
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-12 leading-relaxed">
              Discover vending machine operators in your area or browse our complete network. 
              Connect with professional operators that match your business needs.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        
        {/* Section 1: Location-Based Search */}
        <section className="mb-20">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Find Operators Near You</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Enter your business address to find vending operators that serve your area
              </p>
            </div>
            
            {/* Location Input */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8 max-w-2xl mx-auto">
              <input
                type="text"
                placeholder="Enter your business address..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                className="flex-1 px-6 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
              <button
                onClick={handleGeocode}
                disabled={locationLoading}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 font-semibold"
              >
                {locationLoading ? 'Searching...' : 'Find Operators'}
              </button>
              <button
                onClick={handleUseCurrentLocation}
                disabled={locationLoading}
                className="px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 font-semibold flex items-center justify-center space-x-2"
                title="Use your current location"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Current Location</span>
              </button>
            </div>

            {/* Location Results */}
            {showLocationResults && locationCoords && (
              <div className="space-y-8">
                {/* Map */}
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Interactive Map</h3>
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
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                      Found {nearbyCompanies.length} compan{nearbyCompanies.length !== 1 ? 'ies' : 'y'} serving your area
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
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
                            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 group"
                          >
                            <div className="p-6">
                              <div className="flex items-start space-x-4">
                                {/* Logo Space */}
                                <div className="flex-shrink-0">
                                  {company.logo_url ? (
                                    <img 
                                      src={company.logo_url} 
                                      alt={`${company.name} logo`}
                                      className="w-20 h-20 rounded-xl object-cover border border-gray-200 shadow-sm"
                                    />
                                  ) : (
                                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                                      <span className="text-white font-bold text-xl">
                                        {company.name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Company Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                      <h4 className="text-xl font-bold text-gray-900 mb-1">
                                        {company.name}
                                      </h4>
                                      {company.slogan && (
                                        <p className="text-sm text-gray-600 italic">"{company.slogan}"</p>
                                      )}
                                    </div>
                                    
                                    {/* Distance Badge */}
                                    <div className="flex-shrink-0 ml-4">
                                      <div className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold">
                                        {distance.toFixed(1)} miles
                                      </div>
                                    </div>
                                  </div>

                                  {/* Credentials Grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 font-medium">Active Machines</p>
                                        <p className="text-sm font-semibold text-gray-900">In Network</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 font-medium">VendHub Operator</p>
                                        <p className="text-sm font-semibold text-gray-900">Since {createdDate}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-lg hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200"
                                      >
                                        View Profile
                                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                      </a>
                                      
                                      {companyTemplates[company.id] && companyTemplates[company.id].length > 0 ? (
                                        <a
                                          href={`/customers/onboarding?company_id=${company.id}&template_id=${companyTemplates[company.id][0].id}`}
                                          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-semibold rounded-lg hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200"
                                        >
                                          Start Onboarding
                                          <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                          </svg>
                                        </a>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            showToast('No machine templates available for this operator yet', 'info')
                                          }}
                                          className="inline-flex items-center px-4 py-2 bg-gray-400 text-white text-sm font-semibold rounded-lg cursor-not-allowed"
                                          disabled
                                        >
                                          No Templates
                                          <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                          </svg>
                                        </button>
                                      )}
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
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Operators Found</h3>
                    <p className="text-gray-600">No operators found serving your area. Try browsing all operators below.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Section 2: Browse All Operators */}
        <section className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Browse All Operators</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Explore all vending machine operators in our network
            </p>
          </div>
          
          {/* Search */}
          <div className="mb-8 max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search operators by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-6 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            />
          </div>

          {/* Operators Grid */}
          {filteredOperators.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredOperators.map((operator) => (
                <div
                  key={operator.id}
                  className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 border border-gray-200 group hover:transform hover:-translate-y-1"
                >
                  <div className="flex items-start space-x-4 mb-4">
                    {/* Logo Space */}
                    <div className="flex-shrink-0">
                      {operator.logo_url ? (
                        <img 
                          src={operator.logo_url} 
                          alt={`${operator.name} logo`}
                          className="w-16 h-16 rounded-xl object-cover border border-gray-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                          <span className="text-white font-bold text-lg">
                            {operator.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Company Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {operator.name}
                      </h3>
                      {operator.slogan && (
                        <p className="text-sm text-gray-600 italic">
                          {operator.slogan}
                        </p>
                      )}
                    </div>
                  </div>

                  {operator.description && (
                    <p className="text-gray-600 mb-6 line-clamp-3 leading-relaxed">
                      {operator.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mb-6">
                    <div className="text-sm text-gray-600 space-y-2">
                      {operator.contact_email && (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="truncate">{operator.contact_email}</span>
                        </div>
                      )}
                      {operator.contact_phone && (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{operator.contact_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3">
                    <a
                      href={`/${encodeURIComponent(operator.name)}`}
                      className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-lg hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200"
                    >
                      View Profile
                      <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </a>
                    
                    {companyTemplates[operator.id] && companyTemplates[operator.id].length > 0 ? (
                      <a
                        href={`/customers/onboarding?company_id=${operator.id}&template_id=${companyTemplates[operator.id][0].id}`}
                        className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-semibold rounded-lg hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200"
                      >
                        Start Onboarding
                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </a>
                    ) : (
                      <button
                        onClick={() => {
                          showToast('No machine templates available for this operator yet', 'info')
                        }}
                        className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-gray-400 text-white text-sm font-semibold rounded-lg cursor-not-allowed"
                        disabled
                      >
                        No Templates
                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? 'No operators found matching your search.' : 'No operators available at the moment.'}
              </h3>
              <p className="text-gray-600">
                {searchTerm ? 'Try adjusting your search terms or browse all operators.' : 'Check back later for new operators joining our network.'}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default function BrowseOperatorsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BrowseOperatorsContent />
    </Suspense>
  )
} 