'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ServiceArea, ServiceAreaFormData, ServiceAreaMethod } from '@/types'
import { useToast } from '@/contexts/ToastContext'
import { loadGoogleMaps, getGoogleMaps } from '@/lib/google-maps-loader'
import GoogleMapsDebug from '@/components/debug/GoogleMapsDebug'

interface ServiceAreaManagerProps {
  companyId: string
  onUpdate?: () => void
}

export default function ServiceAreaManager({ companyId, onUpdate }: ServiceAreaManagerProps) {
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingArea, setEditingArea] = useState<ServiceArea | null>(null)
  const [mapLoading, setMapLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)
  const [warehouseLocation, setWarehouseLocation] = useState<{lat: number, lng: number} | null>(null)
  const [formData, setFormData] = useState<ServiceAreaFormData>({
    method: 'polygon',
    name: '',
    polygon_geometry: undefined
  })
  
  const mapRef = useRef<HTMLDivElement>(null)
  const formMapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const formMapInstanceRef = useRef<google.maps.Map | null>(null)
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const circlesRef = useRef<google.maps.Circle[]>([])
  const polygonsRef = useRef<google.maps.Polygon[]>([])
  
  const { showToast } = useToast()

  // Load warehouse location and service areas
  const loadWarehouseLocationAndServiceAreas = async () => {
    try {
      console.log('Loading warehouse location and service areas for company:', companyId)
      
      // First, let's test if we can access the tables at all
      const { data: testData, error: testError } = await supabase
        .from('service_areas')
        .select('count')
        .limit(1)
      
      if (testError) {
        console.error('Test query error:', testError)
        showToast('Cannot access service areas table. Check RLS policies.', 'error')
        return
      }
      
      console.log('Test query successful, loading data...')
      
      // Load warehouse location from company details
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('latitude, longitude')
        .eq('id', companyId)
        .single()

      if (companyError) {
        console.error('Error loading company location:', companyError)
      } else if (companyData?.latitude && companyData?.longitude) {
        console.log('Warehouse location loaded:', companyData)
        setWarehouseLocation({
          lat: companyData.latitude,
          lng: companyData.longitude
        })
      } else {
        console.log('No warehouse location found, using default')
      }
      
      // Load service areas
      const { data, error } = await supabase
        .from('service_areas')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Load service areas error:', error)
        throw error
      }
      
      console.log('Service areas loaded:', data)
      setServiceAreas(data || [])
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Error loading service areas', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Initialize main map
  const initializeMap = () => {
    const google = getGoogleMaps()
    if (!mapRef.current) {
      console.error('Map ref not available')
      return null
    }
    
    if (!google) {
      console.error('Google Maps not loaded')
      return null
    }

    console.log('Initializing main map...')
    
    // Use warehouse location if available, otherwise default to NYC
    const defaultCenter = warehouseLocation || { lat: 40.7128, lng: -74.0060 }
    
    try {
      const map = new google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 10,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      })

      mapInstanceRef.current = map
      console.log('Main map initialized successfully')

      // Add warehouse marker if location is available
      if (warehouseLocation) {
        const warehouseMarker = new google.maps.Marker({
          position: warehouseLocation,
          map: map,
          title: 'Warehouse Location',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#3B82F6"/>
                <path d="M2 17L12 22L22 17" stroke="#3B82F6" stroke-width="2"/>
                <path d="M2 12L12 17L22 12" stroke="#3B82F6" stroke-width="2"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(24, 24),
            anchor: new google.maps.Point(12, 12)
          }
        })
        console.log('Warehouse marker added to main map')
      }

      return map
    } catch (error) {
      console.error('Error initializing main map:', error)
      showToast('Error initializing map. Please check your Google Maps API key.', 'error')
      return null
    }
  }

  // Initialize form map for polygon drawing
  const initializeFormMap = () => {
    const google = getGoogleMaps()
    if (!formMapRef.current) {
      console.error('Form map ref not available')
      return null
    }
    
    if (!google) {
      console.error('Google Maps not loaded')
      return null
    }

    console.log('Initializing form map...')
    
    // Use warehouse location if available, otherwise default to NYC
    const defaultCenter = warehouseLocation || { lat: 40.7128, lng: -74.0060 }
    
    try {
      const map = new google.maps.Map(formMapRef.current, {
        center: defaultCenter,
        zoom: 10,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      })

      formMapInstanceRef.current = map
      console.log('Form map initialized successfully')

      // Add warehouse marker if location is available
      if (warehouseLocation) {
        const warehouseMarker = new google.maps.Marker({
          position: warehouseLocation,
          map: map,
          title: 'Warehouse Location',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#3B82F6"/>
                <path d="M2 17L12 22L22 17" stroke="#3B82F6" stroke-width="2"/>
                <path d="M2 12L12 17L22 12" stroke="#3B82F6" stroke-width="2"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(24, 24),
            anchor: new google.maps.Point(12, 12)
          }
        })
        console.log('Warehouse marker added to form map')
      }

      // Initialize drawing manager
      const drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: true,
        drawingControlOptions: {
          position: google.maps.ControlPosition.TOP_CENTER,
          drawingModes: [
            google.maps.drawing.OverlayType.POLYGON
          ]
        },
        polygonOptions: {
          fillColor: '#FF0000',
          fillOpacity: 0.3,
          strokeWeight: 2,
          strokeColor: '#FF0000',
          editable: true,
          draggable: true
        }
      })

      drawingManager.setMap(map)
      drawingManagerRef.current = drawingManager
      console.log('Drawing manager initialized')

      // Listen for polygon completion
      google.maps.event.addListener(drawingManager, 'polygoncomplete', (polygon: google.maps.Polygon) => {
        console.log('Polygon completed')
        // Clear previous polygon
        polygonsRef.current.forEach(p => p.setMap(null))
        polygonsRef.current = [polygon]

        // Convert to GeoJSON
        const path = polygon.getPath()
        const coordinates = path.getArray().map(latLng => [latLng.lng(), latLng.lat()])
        // Close the polygon
        coordinates.push(coordinates[0])

        setFormData(prev => ({
          ...prev,
          method: 'polygon',
          polygon_geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
          }
        }))
      })

      return map
    } catch (error) {
      console.error('Error initializing form map:', error)
      showToast('Error initializing form map. Please check your Google Maps API key.', 'error')
      return null
    }
  }

  // Load Google Maps script
  useEffect(() => {
    const initMap = async () => {
      try {
        setMapLoading(true)
        setMapError(null)
        console.log('Loading Google Maps...')
        await loadGoogleMaps()
        console.log('Google Maps loaded successfully')
        
        // Wait for the DOM to be ready and ensure map ref exists
        setTimeout(() => {
          if (mapRef.current) {
            initializeMap()
          } else {
            console.warn('Map ref not ready, retrying...')
            // Retry after a longer delay
            setTimeout(() => {
              if (mapRef.current) {
                initializeMap()
              } else {
                console.error('Map ref still not available after retry')
                setMapError('Map container not found')
              }
            }, 500)
          }
          setMapLoading(false)
        }, 200)
      } catch (error) {
        console.error('Error loading Google Maps:', error)
        setMapError('Failed to load Google Maps. Please check your API key.')
        setMapLoading(false)
        showToast('Error loading map. Please check your Google Maps API key.', 'error')
      }
    }

    initMap()
  }, [warehouseLocation])

  // Initialize form map when form opens and polygon method is selected
  useEffect(() => {
    if (showForm && formData.method === 'polygon') {
      const initFormMap = async () => {
        try {
          // Wait for the form map ref to be available
          setTimeout(() => {
            if (formMapRef.current) {
              const map = initializeFormMap()
              if (!map) {
                console.warn('Form map initialization failed, retrying...')
                // Retry after a longer delay
                setTimeout(() => {
                  if (formMapRef.current) {
                    initializeFormMap()
                  }
                }, 500)
              }
            } else {
              console.warn('Form map ref not ready, retrying...')
              // Retry after a longer delay
              setTimeout(() => {
                if (formMapRef.current) {
                  initializeFormMap()
                }
              }, 500)
            }
          }, 200)
        } catch (error) {
          console.error('Error initializing form map:', error)
        }
      }
      
      initFormMap()
    }
  }, [showForm, formData.method, warehouseLocation])

  // Load service areas on mount
  useEffect(() => {
    loadWarehouseLocationAndServiceAreas()
  }, [companyId])

  // Render service areas on map
  useEffect(() => {
    if (!mapInstanceRef.current) return

    const google = getGoogleMaps()
    if (!google) return

    // Clear existing overlays
    markersRef.current.forEach(marker => marker.setMap(null))
    circlesRef.current.forEach(circle => circle.setMap(null))
    polygonsRef.current.forEach(polygon => polygon.setMap(null))
    markersRef.current = []
    circlesRef.current = []
    polygonsRef.current = []

    // Render each service area
    serviceAreas.forEach(area => {
      if (area.method === 'polygon' && area.polygon_geometry) {
        // Create polygon
        const polygon = new google.maps.Polygon({
          paths: area.polygon_geometry.coordinates[0].map(coord => ({
            lat: coord[1],
            lng: coord[0]
          })),
          strokeColor: '#FF0000',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#FF0000',
          fillOpacity: 0.35,
          map: mapInstanceRef.current
        })
        polygonsRef.current.push(polygon)
      }
    })
  }, [serviceAreas])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      console.log('Submitting form data:', formData)
      
      // Validate required fields
      if (formData.method === 'polygon') {
        if (!formData.polygon_geometry) {
          showToast('Please draw a polygon on the map', 'error')
          setSaving(false)
          return
        }
      }
      
      // Prepare data based on method
      let data: any = {
        company_id: companyId,
        method: formData.method,
        name: formData.name || null,
        polygon_geometry: formData.polygon_geometry
      }

      console.log('Prepared data for submission:', data)

      if (editingArea) {
        // Update existing
        const { data: result, error } = await supabase
          .from('service_areas')
          .update(data)
          .eq('id', editingArea.id)
          .select()

        if (error) {
          console.error('Supabase update error:', error)
          throw error
        }
        console.log('Update result:', result)
        showToast('Service area updated successfully', 'success')
      } else {
        // Create new
        const { data: result, error } = await supabase
          .from('service_areas')
          .insert(data)
          .select()

        if (error) {
          console.error('Supabase insert error:', error)
          throw error
        }
        console.log('Insert result:', result)
        showToast('Service area created successfully', 'success')
      }

      // Reset form and reload
      setFormData({
        method: 'polygon',
        name: '',
        polygon_geometry: undefined
      })
      setShowForm(false)
      setEditingArea(null)
      loadWarehouseLocationAndServiceAreas()
      onUpdate?.()
    } catch (error) {
      console.error('Error saving service area:', error)
      showToast('Error saving service area', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service area?')) return

    try {
      const { error } = await supabase
        .from('service_areas')
        .delete()
        .eq('id', id)

      if (error) throw error
      showToast('Service area deleted successfully', 'success')
      loadWarehouseLocationAndServiceAreas()
      onUpdate?.()
    } catch (error) {
      console.error('Error deleting service area:', error)
      showToast('Error deleting service area', 'error')
    }
  }

  // Handle edit
  const handleEdit = (area: ServiceArea) => {
    setEditingArea(area)
    setFormData({
      method: area.method,
      name: area.name || '',
      polygon_geometry: area.polygon_geometry
    })
    setShowForm(true)
  }



  if (loading) {
    return <div className="text-center py-8">Loading service areas...</div>
  }

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      <GoogleMapsDebug />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Service Areas</h3>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Service Area
        </button>
      </div>

      {/* Service Areas List */}
      {serviceAreas.length > 0 && (
        <div className="space-y-4">
          {serviceAreas.map(area => (
            <div key={area.id} className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">
                    {area.name || `Service Area ${area.method}`}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Method: Polygon
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(area)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(area.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h4 className="font-medium mb-4">Service Areas Map</h4>
        <div 
          ref={mapRef} 
          className="w-full h-96 rounded-lg border bg-gray-100 flex items-center justify-center"
        >
          {mapLoading ? (
            <div className="text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p>Loading map...</p>
              <p className="text-sm">Please wait while the map loads</p>
            </div>
          ) : mapError ? (
            <div className="text-center text-red-500">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="font-medium">Map Error</p>
              <p className="text-sm">{mapError}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p>Map loaded successfully</p>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingArea ? 'Edit Service Area' : 'Add Service Area'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Downtown Area"
                />
              </div>





              {/* Polygon Method Instructions */}
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-md">
                  <p className="text-sm text-blue-800">
                    Use the drawing tools on the map below to create your service area polygon. 
                    Click the polygon tool and draw your area on the map.
                  </p>
                </div>
                <div 
                  ref={formMapRef} 
                  className="w-full h-64 rounded-lg border bg-gray-100"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingArea(null)
                    setFormData({
                      method: 'polygon',
                      name: '',
                      polygon_geometry: undefined
                    })
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : (editingArea ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 