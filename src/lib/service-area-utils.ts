import { supabase } from './supabase'
import { ServiceArea } from '@/types'

/**
 * Check if a location is within any service area of a specific company
 */
export async function isLocationInCompanyServiceArea(
  companyId: string,
  lat: number,
  lng: number
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('is_location_in_service_area', {
        company_uuid: companyId,
        lat: lat,
        lng: lng
      })

    if (error) throw error
    return data || false
  } catch (error) {
    console.error('Error checking location in service area:', error)
    return false
  }
}

/**
 * Get all companies that serve a specific location
 */
export async function getCompaniesServingLocation(
  lat: number,
  lng: number
): Promise<Array<{
  company_id: string
  company_name: string
  service_area_id: string
  service_area_name?: string
  method: string
}>> {
  try {
    const { data, error } = await supabase
      .rpc('get_companies_serving_location', {
        lat: lat,
        lng: lng
      })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting companies serving location:', error)
    return []
  }
}

/**
 * Get all service areas for a company
 */
export async function getCompanyServiceAreas(companyId: string): Promise<ServiceArea[]> {
  try {
    const { data, error } = await supabase
      .from('service_areas')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error loading service areas:', error)
    return []
  }
}

/**
 * Create a new service area
 */
export async function createServiceArea(
  companyId: string,
  serviceAreaData: Omit<ServiceArea, 'id' | 'company_id' | 'created_at' | 'updated_at'>
): Promise<ServiceArea | null> {
  try {
    const { data, error } = await supabase
      .from('service_areas')
      .insert({
        company_id: companyId,
        ...serviceAreaData
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating service area:', error)
    return null
  }
}

/**
 * Update an existing service area
 */
export async function updateServiceArea(
  serviceAreaId: string,
  serviceAreaData: Partial<Omit<ServiceArea, 'id' | 'company_id' | 'created_at' | 'updated_at'>>
): Promise<ServiceArea | null> {
  try {
    const { data, error } = await supabase
      .from('service_areas')
      .update(serviceAreaData)
      .eq('id', serviceAreaId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating service area:', error)
    return null
  }
}

/**
 * Delete a service area
 */
export async function deleteServiceArea(serviceAreaId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('service_areas')
      .delete()
      .eq('id', serviceAreaId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting service area:', error)
    return false
  }
}

/**
 * Convert miles to meters
 */
export function milesToMeters(miles: number): number {
  return miles * 1609.34
}

/**
 * Convert meters to miles
 */
export function metersToMiles(meters: number): number {
  return meters / 1609.34
}

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Validate GeoJSON polygon coordinates
 */
export function validatePolygonCoordinates(coordinates: number[][][]): boolean {
  if (!coordinates || coordinates.length === 0) return false
  
  // Check if it's a valid polygon (at least 3 points, first and last should be the same)
  const ring = coordinates[0]
  if (!ring || ring.length < 4) return false
  
  // Check if first and last points are the same (closed polygon)
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) return false
  
  // Validate coordinate ranges
  for (const coord of ring) {
    if (coord.length !== 2) return false
    const [lng, lat] = coord
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return false
  }
  
  return true
} 