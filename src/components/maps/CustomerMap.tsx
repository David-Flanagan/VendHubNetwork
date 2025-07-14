'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Company } from '@/types'
import { loadGoogleMaps, getGoogleMaps } from '@/lib/google-maps-loader'
import { useToast } from '@/contexts/ToastContext'

interface CustomerMapProps {
  customerLat: number
  customerLng: number
  nearbyCompanies: Company[]
  onCompanyClick?: (company: Company) => void
}

export default function CustomerMap({ 
  customerLat, 
  customerLng, 
  nearbyCompanies, 
  onCompanyClick 
}: CustomerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const circlesRef = useRef<google.maps.Circle[]>([])
  const polygonsRef = useRef<google.maps.Polygon[]>([])
  const [mapLoading, setMapLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)
  const { showToast } = useToast()

  // Initialize map
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
  }, [customerLat, customerLng])

  // Initialize map function (separate from useEffect)
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

    console.log('Initializing customer map...')
    
    try {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: customerLat, lng: customerLng },
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true
      })

      mapInstanceRef.current = map
      console.log('Customer map initialized successfully')

      // Add customer location marker
      const customerMarker = new google.maps.Marker({
        position: { lat: customerLat, lng: customerLng },
        map: map,
        title: 'Your Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="16" fill="#3B82F6"/>
              <circle cx="16" cy="16" r="8" fill="white"/>
              <circle cx="16" cy="16" r="4" fill="#3B82F6"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16)
        }
      })

      // Add info window for customer location
      const customerInfoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <h3 class="font-semibold text-gray-900">Your Location</h3>
            <p class="text-sm text-gray-600">${customerLat.toFixed(6)}, ${customerLng.toFixed(6)}</p>
          </div>
        `
      })

      customerMarker.addListener('click', () => {
        customerInfoWindow.open(map, customerMarker)
      })

      return map
    } catch (error) {
      console.error('Error initializing customer map:', error)
      showToast('Error initializing map. Please check your Google Maps API key.', 'error')
      return null
    }
  }

  // Render companies and service areas
  useEffect(() => {
    if (!mapInstanceRef.current || !nearbyCompanies.length) return

    const google = getGoogleMaps()
    if (!google) return

    // Clear existing overlays
    markersRef.current.forEach(marker => marker.setMap(null))
    circlesRef.current.forEach(circle => circle.setMap(null))
    polygonsRef.current.forEach(polygon => polygon.setMap(null))
    markersRef.current = []
    circlesRef.current = []
    polygonsRef.current = []

    // Add company markers and service areas
    nearbyCompanies.forEach((company, index) => {
      if (!company.latitude || !company.longitude) return

      // Create company marker
      const marker = new google.maps.Marker({
        position: { lat: company.latitude, lng: company.longitude },
        map: mapInstanceRef.current,
        title: company.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="14" fill="#10B981"/>
              <path d="M14 4L24 14L14 24L4 14L14 4Z" fill="white"/>
              <path d="M14 8L20 14L14 20L8 14L14 8Z" fill="#10B981"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(28, 28),
          anchor: new google.maps.Point(14, 14)
        }
      })

      markersRef.current.push(marker)

      // Create info window for company
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-3 max-w-xs">
            <h3 class="font-semibold text-gray-900 text-sm">${company.name}</h3>
            ${company.slogan ? `<p class="text-xs text-gray-600 mt-1">${company.slogan}</p>` : ''}
            <div class="mt-3">
              <button 
                onclick="window.open('/${encodeURIComponent(company.name)}', '_blank')"
                class="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                View Company Profile
              </button>
            </div>
          </div>
        `
      })

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker)
        // Remove the automatic navigation - let users click the button instead
        // onCompanyClick?.(company)
      })

      // Add service areas if available
      if (company.service_areas && company.service_areas.length > 0) {
        company.service_areas.forEach((area: any) => {
          if (area.method === 'radius' && area.center_lat && area.center_lng && area.radius_meters) {
            // Create radius circle
            const circle = new google.maps.Circle({
              strokeColor: '#10B981',
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: '#10B981',
              fillOpacity: 0.1,
              map: mapInstanceRef.current,
              center: { lat: area.center_lat, lng: area.center_lng },
              radius: area.radius_meters
            })
            circlesRef.current.push(circle)
          } else if (area.method === 'polygon' && area.polygon_geometry) {
            // Create polygon
            const polygon = new google.maps.Polygon({
              paths: area.polygon_geometry.coordinates[0].map((coord: number[]) => ({
                lat: coord[1],
                lng: coord[0]
              })),
              strokeColor: '#10B981',
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: '#10B981',
              fillOpacity: 0.1,
              map: mapInstanceRef.current
            })
            polygonsRef.current.push(polygon)
          }
        })
      }
    })

    // Fit map to show all markers
    if (markersRef.current.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      
      // Add customer location to bounds
      bounds.extend({ lat: customerLat, lng: customerLng })
      
      // Add all company locations to bounds
      markersRef.current.forEach(marker => {
        bounds.extend(marker.getPosition()!)
      })
      
      mapInstanceRef.current.fitBounds(bounds)
      
      // Ensure minimum zoom level
      google.maps.event.addListenerOnce(mapInstanceRef.current, 'bounds_changed', () => {
        if (mapInstanceRef.current!.getZoom()! > 15) {
          mapInstanceRef.current!.setZoom(15)
        }
      })
    }
  }, [nearbyCompanies, customerLat, customerLng, onCompanyClick])

  if (mapLoading) {
    return (
      <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    )
  }

  if (mapError) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
          <div className="text-center text-red-500">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm font-medium">Map Error</p>
            <p className="text-xs">{mapError}</p>
            <div className="mt-2 text-xs text-gray-500">
              <p>You can still view the company list below.</p>
            </div>
          </div>
        </div>
        
        {/* Fallback: Show company locations as text */}
        {nearbyCompanies.length > 0 && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800 font-medium mb-2">Company Locations:</p>
            <div className="space-y-1">
              {nearbyCompanies.map((company, index) => (
                <div key={company.id} className="text-xs text-blue-700">
                  • {company.name}: {company.latitude?.toFixed(4)}, {company.longitude?.toFixed(4)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Map Legend */}
      <div className="flex items-center justify-center space-x-6 text-xs text-gray-600">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
          <span>Your Location</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-600 rounded-full"></div>
          <span>Vending Companies</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-600 bg-opacity-20 border border-green-600 rounded-full"></div>
          <span>Service Areas</span>
        </div>
      </div>

      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="w-full h-64 rounded-lg border bg-gray-100"
      />
    </div>
  )
} 