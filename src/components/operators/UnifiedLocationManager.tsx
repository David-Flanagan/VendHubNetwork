'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Company, ServiceArea } from '@/types'
import { useToast } from '@/contexts/ToastContext'
import { loadGoogleMaps, getGoogleMaps } from '@/lib/google-maps-loader'
import { geocodeAddress } from '@/lib/geocoding'

interface UnifiedLocationManagerProps {
  company: Company
  onUpdate: (updatedCompany: Company) => void
  showCardWrapper?: boolean
}

// Remove radius-related fields from ServiceAreaFormData
type ServiceAreaFormData = {
  method: 'polygon';
  name: string;
  polygon_geometry?: any;
};

export default function UnifiedLocationManager({ company, onUpdate, showCardWrapper = true }: UnifiedLocationManagerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([])
  const [mapLoading, setMapLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)
  const [warehouseLocation, setWarehouseLocation] = useState<{lat: number, lng: number} | null>(null)
  
  // Form data for warehouse location
  const [locationData, setLocationData] = useState({
    address: company.address || '',
    latitude: company.latitude?.toString() || '',
    longitude: company.longitude?.toString() || '',
    map_enabled: company.map_enabled || false
  })
  
  // Form data for service area
  // Remove all radius-related state and default to polygon
  const [serviceAreaData, setServiceAreaData] = useState<ServiceAreaFormData>({
    method: 'polygon',
    name: '',
    polygon_geometry: undefined
  })
  
  const [showServiceAreaForm, setShowServiceAreaForm] = useState(false)
  const [editingServiceArea, setEditingServiceArea] = useState<ServiceArea | null>(null)
  
  // Map refs
  const mapRef = useRef<HTMLDivElement>(null)
  const serviceAreaMapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const serviceAreaMapInstanceRef = useRef<google.maps.Map | null>(null)
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const circlesRef = useRef<google.maps.Circle[]>([])
  const polygonsRef = useRef<google.maps.Polygon[]>([])
  
  const { showToast } = useToast()

  // Load service areas on mount
  useEffect(() => {
    loadServiceAreas()
  }, [company.id])

  // Load Google Maps and initialize
  useEffect(() => {
    const initMap = async () => {
      try {
        setMapLoading(true)
        setMapError(null)
        await loadGoogleMaps()
        
        setTimeout(() => {
          if (mapRef.current) {
            initializeMap()
          }
          setMapLoading(false)
        }, 200)
      } catch (error) {
        console.error('Error loading Google Maps:', error)
        setMapError('Failed to load Google Maps. Please check your API key.')
        setMapLoading(false)
      }
    }

    initMap()
  }, [warehouseLocation])

  const loadServiceAreas = async () => {
    try {
      const { data, error } = await supabase
        .from('service_areas')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setServiceAreas(data || [])
    } catch (error) {
      console.error('Error loading service areas:', error)
      showToast('Error loading service areas', 'error')
    }
  }

  const initializeMap = () => {
    const google = getGoogleMaps()
    if (!mapRef.current || !google) return

    const defaultCenter = warehouseLocation || { lat: 40.7128, lng: -74.0060 }
    
    try {
      const map = new google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 10,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      })

      mapInstanceRef.current = map

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
      }
    } catch (error) {
      console.error('Error initializing map:', error)
      setMapError('Error initializing map')
    }
  }

  const initializeServiceAreaMap = () => {
    const google = getGoogleMaps()
    if (!serviceAreaMapRef.current || !google) return

    const defaultCenter = warehouseLocation || { lat: 40.7128, lng: -74.0060 }
    
    try {
      const map = new google.maps.Map(serviceAreaMapRef.current, {
        center: defaultCenter,
        zoom: 10,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      })

      serviceAreaMapInstanceRef.current = map

      // Add warehouse marker
      if (warehouseLocation) {
        new google.maps.Marker({
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
      }

      // Initialize drawing manager for polygon
      {
        const drawingManager = new google.maps.drawing.DrawingManager({
          drawingMode: null,
          drawingControl: true,
          drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [google.maps.drawing.OverlayType.POLYGON]
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

        // Listen for polygon completion
        google.maps.event.addListener(drawingManager, 'polygoncomplete', (polygon: google.maps.Polygon) => {
          // Clear previous polygon
          polygonsRef.current.forEach(p => p.setMap(null))
          polygonsRef.current = [polygon]

          // Convert to GeoJSON
          const path = polygon.getPath()
          const coordinates = path.getArray().map(latLng => [latLng.lng(), latLng.lat()])
          coordinates.push(coordinates[0]) // Close the polygon

          setServiceAreaData(prev => ({
            ...prev,
            polygon_geometry: {
              type: 'Polygon',
              coordinates: [coordinates]
            }
          }))
        })
      }
    } catch (error) {
      console.error('Error initializing service area map:', error)
    }
  }

  // Initialize service area map when form opens
  useEffect(() => {
    if (showServiceAreaForm) {
      setTimeout(() => {
        if (serviceAreaMapRef.current) {
          initializeServiceAreaMap()
        }
      }, 200)
    }
  }, [showServiceAreaForm, warehouseLocation])

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

  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setLocationData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const numValue = value === '' ? '' : parseFloat(value)
    setLocationData(prev => ({
      ...prev,
      [name]: numValue === '' ? '' : numValue
    }))
  }

  const handleGeocodeAddress = async () => {
    if (!locationData.address) {
      showToast('Please enter an address first', 'warning')
      return
    }

    setGeocoding(true)
    try {
      await loadGoogleMaps()
      const result = await geocodeAddress(locationData.address)
      if (result.success) {
        setLocationData(prev => ({
          ...prev,
          latitude: result.latitude.toString(),
          longitude: result.longitude.toString()
        }))
        setWarehouseLocation({ lat: result.latitude, lng: result.longitude })
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
  }

  const handleSaveLocation = async () => {
    setLoading(true)
    try {
      const updateData = {
        address: locationData.address,
        latitude: locationData.latitude ? parseFloat(locationData.latitude) : null,
        longitude: locationData.longitude ? parseFloat(locationData.longitude) : null,
        map_enabled: locationData.map_enabled
      }

      const { data, error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', company.id)
        .select()
        .single()

      if (error) throw error

      onUpdate(data)
      setWarehouseLocation(data.latitude && data.longitude ? { lat: data.latitude, lng: data.longitude } : null)
      setIsEditing(false)
      showToast('Location information updated successfully!', 'success')
    } catch (error) {
      console.error('Error updating location:', error)
      showToast('Failed to update location information. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleServiceAreaMethodChange = () => {
    // Method is always polygon, no need to change
  }

  const handleSaveServiceArea = async () => {
    if (!warehouseLocation) {
      showToast('Please set your warehouse location first', 'warning')
      return
    }

    setLoading(true)
    try {
      let data: any = {
        company_id: company.id,
        method: 'polygon',
        name: serviceAreaData.name || null,
        polygon_geometry: serviceAreaData.polygon_geometry
      }

      if (!serviceAreaData.polygon_geometry) {
        showToast('Please draw a polygon on the map', 'error')
        setLoading(false)
        return
      }

      if (editingServiceArea) {
        const { error } = await supabase
          .from('service_areas')
          .update(data)
          .eq('id', editingServiceArea.id)

        if (error) throw error
        showToast('Service area updated successfully', 'success')
      } else {
        const { error } = await supabase
          .from('service_areas')
          .insert(data)

        if (error) throw error
        showToast('Service area created successfully', 'success')
      }

      setServiceAreaData({
        method: 'polygon',
        name: '',
        polygon_geometry: undefined
      })
      setShowServiceAreaForm(false)
      setEditingServiceArea(null)
      loadServiceAreas()
    } catch (error) {
      console.error('Error saving service area:', error)
      showToast('Error saving service area', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteServiceArea = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service area?')) return

    try {
      const { error } = await supabase
        .from('service_areas')
        .delete()
        .eq('id', id)

      if (error) throw error
      showToast('Service area deleted successfully', 'success')
      loadServiceAreas()
    } catch (error) {
      console.error('Error deleting service area:', error)
      showToast('Error deleting service area', 'error')
    }
  }

  const handleEditServiceArea = (area: ServiceArea) => {
    setEditingServiceArea(area)
    setServiceAreaData({
      method: 'polygon',
      name: area.name || '',
      polygon_geometry: area.polygon_geometry
    })
    setShowServiceAreaForm(true)
  }

  const renderLocationSection = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Warehouse Address *
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            name="address"
            value={locationData.address}
            onChange={handleLocationInputChange}
            placeholder="Enter your warehouse address"
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleGeocodeAddress}
            disabled={geocoding || !locationData.address}
            className="px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {geocoding ? 'Converting...' : 'Generate Coordinates'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Latitude
          </label>
          <input
            type="number"
            name="latitude"
            value={locationData.latitude}
            onChange={handleNumberInputChange}
            step="any"
            placeholder="e.g., 40.7128"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Longitude
          </label>
          <input
            type="number"
            name="longitude"
            value={locationData.longitude}
            onChange={handleNumberInputChange}
            step="any"
            placeholder="e.g., -74.0060"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            name="map_enabled"
            checked={locationData.map_enabled}
            onChange={(e) => setLocationData(prev => ({ ...prev, map_enabled: e.target.checked }))}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label className="ml-2 text-sm font-semibold text-gray-700">
            Show map on company profile page
          </label>
        </div>
      </div>
    </div>
  )

  const renderServiceAreaSection = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Service Areas</h3>
        <button
          onClick={() => setShowServiceAreaForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Service Area
        </button>
      </div>

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
                    onClick={() => handleEditServiceArea(area)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteServiceArea(area.id)}
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
            </div>
          ) : mapError ? (
            <div className="text-center text-red-500">
              <p className="font-medium">Map Error</p>
              <p className="text-sm">{mapError}</p>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <p>Map loaded successfully</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderServiceAreaForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {editingServiceArea ? 'Edit Service Area' : 'Add Service Area'}
        </h3>
        
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name (Optional)
            </label>
            <input
              type="text"
              value={serviceAreaData.name}
              onChange={(e) => setServiceAreaData(prev => ({ ...prev, name: e.target.value }))}
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
              ref={serviceAreaMapRef} 
              className="w-full h-64 rounded-lg border bg-gray-100"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowServiceAreaForm(false)
                setEditingServiceArea(null)
                setServiceAreaData({
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
              type="button"
              onClick={handleSaveServiceArea}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : (editingServiceArea ? 'Update' : 'Create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

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
                <h2 className="text-2xl font-bold text-gray-900">Location & Service Areas</h2>
                <p className="text-gray-600">Manage your warehouse location and service coverage</p>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Edit Location & Service Areas
            </button>
          </div>
        )}

        {!showCardWrapper && (
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Edit Location & Service Areas
            </button>
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

          <div className="flex items-center p-4 bg-gray-50 rounded-xl">
            <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-700">
              Map Display: {company.map_enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <div className="flex items-center p-4 bg-gray-50 rounded-xl">
            <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
            </svg>
            <span className="text-gray-700">
              Service Areas: {serviceAreas.length} configured
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
            <h2 className="text-2xl font-bold text-gray-900">Edit Location & Service Areas</h2>
            <p className="text-gray-600">Update your warehouse location and service coverage</p>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* Step 1: Warehouse Location */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Step 1: Warehouse Location</h3>
          {renderLocationSection()}
        </div>

        {/* Step 2: Service Areas */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Step 2: Service Areas</h3>
          {renderServiceAreaSection()}
        </div>

        {/* Save/Cancel Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={handleSaveLocation}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={() => {
              setIsEditing(false)
              setLocationData({
                address: company.address || '',
                latitude: company.latitude?.toString() || '',
                longitude: company.longitude?.toString() || '',
                map_enabled: company.map_enabled || false
              })
            }}
            disabled={loading}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Service Area Form Modal */}
      {showServiceAreaForm && renderServiceAreaForm()}
    </>
  )
} 