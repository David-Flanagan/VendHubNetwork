'use client'

import { useEffect, useRef, useState } from 'react'
import { Wrapper, Status } from '@googlemaps/react-wrapper'
import { Company, ServiceArea } from '@/types'
import { supabase } from '@/lib/supabase'

interface ServiceAreasMapProps {
  company: Company
  className?: string
}

interface MapComponentProps {
  company: Company
  serviceAreas: ServiceArea[]
}

const MapComponent = ({ company, serviceAreas }: MapComponentProps) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || !company.latitude || !company.longitude) return

    const companyLocation = {
      lat: company.latitude,
      lng: company.longitude
    }

    // Calculate appropriate zoom level based on service areas
    const calculateZoomLevel = () => {
      if (serviceAreas.length === 0) {
        return 9 // Default zoom for companies without service areas
      }
      
      // Find the largest service area to determine zoom
      let maxRadius = 0
      serviceAreas.forEach(area => {
        if (area.method === 'radius' && area.radius_meters) {
          const radiusMiles = area.radius_meters / 1609.34
          maxRadius = Math.max(maxRadius, radiusMiles)
        }
      })
      
      if (maxRadius <= 25) return 8
      if (maxRadius <= 50) return 7
      if (maxRadius <= 100) return 6
      if (maxRadius <= 200) return 5
      return 4
    }

    const mapOptions: google.maps.MapOptions = {
      center: companyLocation,
      zoom: calculateZoomLevel(),
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    }

    const newMap = new google.maps.Map(mapRef.current, mapOptions)
    setMap(newMap)
    mapInstanceRef.current = newMap

    // Add warehouse marker
    const warehouseMarker = new google.maps.Marker({
      position: companyLocation,
      map: newMap,
      title: `${company.name} Warehouse`,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#3B82F6" stroke="white" stroke-width="2"/>
            <path d="M16 8l-8 6v10h16V14l-8-6z" fill="white"/>
            <rect x="12" y="18" width="8" height="6" fill="white"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 32)
      }
    })

    // Render each service area
    serviceAreas.forEach((area, index) => {
      if (area.method === 'radius' && area.center_lat && area.center_lng && area.radius_meters) {
        // Create circle for radius service area
        const serviceAreaCircle = new google.maps.Circle({
          strokeColor: '#3B82F6',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#3B82F6',
          fillOpacity: 0.2,
          map: newMap,
          center: { lat: area.center_lat!, lng: area.center_lng! },
          radius: area.radius_meters
        })

        // Add distance markers at cardinal points
        const radiusMiles = area.radius_meters / 1609.34
        const addDistanceMarker = (bearing: number, distance: number) => {
          if (!area.center_lat || !area.center_lng) return
          
          const lat1 = area.center_lat * Math.PI / 180
          const lon1 = area.center_lng * Math.PI / 180
          const brng = bearing * Math.PI / 180
          const R = 3959 // Earth's radius in miles

          const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(distance / R) +
            Math.cos(lat1) * Math.sin(distance / R) * Math.cos(brng)
          )

          const lon2 = lon1 + Math.atan2(
            Math.sin(brng) * Math.sin(distance / R) * Math.cos(lat1),
            Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2)
          )

          const markerPosition = {
            lat: lat2 * 180 / Math.PI,
            lng: lon2 * 180 / Math.PI
          }

          new google.maps.Marker({
            position: markerPosition,
            map: newMap,
            label: {
              text: `${distance.toFixed(1)} mi`,
              color: '#3B82F6',
              fontSize: '12px',
              fontWeight: 'bold'
            },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 0,
              fillColor: '#3B82F6',
              fillOpacity: 0.8,
              strokeColor: '#3B82F6',
              strokeWeight: 2
            }
          })
        }

        // Add distance markers at N, S, E, W
        addDistanceMarker(0, radiusMiles) // North
        addDistanceMarker(180, radiusMiles) // South
        addDistanceMarker(90, radiusMiles) // East
        addDistanceMarker(270, radiusMiles) // West

      } else if (area.method === 'polygon' && area.polygon_geometry) {
        // Create polygon for polygon service area
        const polygon = new google.maps.Polygon({
          paths: area.polygon_geometry.coordinates[0].map(coord => ({
            lat: coord[1],
            lng: coord[0]
          })),
          strokeColor: '#3B82F6',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#3B82F6',
          fillOpacity: 0.2,
          map: newMap
        })
      }
    })

    return () => {
      if (mapInstanceRef.current) {
        google.maps.event.clearInstanceListeners(mapInstanceRef.current)
      }
    }
  }, [company, serviceAreas])

  return (
    <div 
      ref={mapRef} 
      className="w-full h-96 rounded-lg shadow-sm"
      style={{ minHeight: '400px' }}
    />
  )
}

const render = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return (
        <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )
    case Status.FAILURE:
      return (
        <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Failed to load map</p>
            <p className="text-sm text-gray-500">Please check your internet connection</p>
          </div>
        </div>
      )
    default:
      return (
        <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )
  }
}

export default function ServiceAreasMap({ company, className = '' }: ServiceAreasMapProps) {
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadServiceAreas = async () => {
      try {
        const { data, error } = await supabase
          .from('service_areas')
          .select('*')
          .eq('company_id', company.id)
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error loading service areas:', error)
        } else {
          setServiceAreas(data || [])
        }
      } catch (error) {
        console.error('Error loading service areas:', error)
      } finally {
        setLoading(false)
      }
    }

    if (company.id) {
      loadServiceAreas()
    }
  }, [company.id])

  if (!company.map_enabled || !company.latitude || !company.longitude) {
    return null
  }

  if (loading) {
    return (
      <div className={`w-full ${className}`}>
        <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full ${className}`}>
      <Wrapper 
        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''} 
        render={render}
      >
        <MapComponent company={company} serviceAreas={serviceAreas} />
      </Wrapper>
      
      {/* Map Legend */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-600 rounded-full mr-2"></div>
            <span className="text-gray-700">Warehouse Location</span>
          </div>
          {serviceAreas.length > 0 && (
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-600 bg-opacity-20 border-2 border-blue-600 rounded-full mr-2"></div>
              <span className="text-gray-700">Service Areas</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 