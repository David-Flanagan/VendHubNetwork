// Geocoding utility using Google Maps Geocoding API
import { loadGoogleMaps } from './google-maps-loader'

interface GeocodingResult {
  latitude: number
  longitude: number
  formattedAddress: string
  success: boolean
  error?: string
}

export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  try {
    // Load Google Maps if not already loaded
    await loadGoogleMaps()
    
    // Ensure Google Maps is loaded
    if (!window.google || !window.google.maps) {
      throw new Error('Google Maps not loaded')
    }

    const geocoder = new window.google.maps.Geocoder()
    
    return new Promise((resolve) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === window.google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const location = results[0].geometry.location
          resolve({
            latitude: location.lat(),
            longitude: location.lng(),
            formattedAddress: results[0].formatted_address,
            success: true
          })
        } else {
          resolve({
            latitude: 0,
            longitude: 0,
            formattedAddress: '',
            success: false,
            error: `Geocoding failed: ${status}`
          })
        }
      })
    })
  } catch (error) {
    return {
      latitude: 0,
      longitude: 0,
      formattedAddress: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult> {
  try {
    // Load Google Maps if not already loaded
    await loadGoogleMaps()
    
    // Ensure Google Maps is loaded
    if (!window.google || !window.google.maps) {
      throw new Error('Google Maps not loaded')
    }

    const geocoder = new window.google.maps.Geocoder()
    
    return new Promise((resolve) => {
      geocoder.geocode({ 
        location: { lat: latitude, lng: longitude } 
      }, (results, status) => {
        if (status === window.google.maps.GeocoderStatus.OK && results && results.length > 0) {
          resolve({
            latitude,
            longitude,
            formattedAddress: results[0].formatted_address,
            success: true
          })
        } else {
          resolve({
            latitude,
            longitude,
            formattedAddress: '',
            success: false,
            error: `Reverse geocoding failed: ${status}`
          })
        }
      })
    })
  } catch (error) {
    return {
      latitude,
      longitude,
      formattedAddress: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
} 