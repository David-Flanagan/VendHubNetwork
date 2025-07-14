// Google Maps API Loader Utility
// Prevents duplicate script loading and provides a clean interface

declare global {
  interface Window {
    google: typeof google
    googleMapsLoaded: boolean
    googleMapsLoadPromise?: Promise<void>
  }
}

let loadPromise: Promise<void> | null = null

export function loadGoogleMaps(): Promise<void> {
  console.log('loadGoogleMaps called')
  
  // If already loaded, return immediately
  if (window.google && window.googleMapsLoaded) {
    console.log('Google Maps already loaded')
    return Promise.resolve()
  }

  // If already loading, return the existing promise
  if (loadPromise) {
    console.log('Google Maps already loading, returning existing promise')
    return loadPromise
  }

  // If window.googleMapsLoadPromise exists, return it
  if (window.googleMapsLoadPromise) {
    console.log('Google Maps load promise exists on window')
    return window.googleMapsLoadPromise
  }

  console.log('Creating new Google Maps load promise')
  
  // Create new load promise
  loadPromise = new Promise<void>((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      console.log('Google Maps script already exists, waiting for load')
      // Script exists, wait for it to load
      const checkLoaded = () => {
        if (window.google && window.google.maps) {
          console.log('Google Maps loaded from existing script')
          window.googleMapsLoaded = true
          resolve()
        } else {
          setTimeout(checkLoaded, 100)
        }
      }
      checkLoaded()
      return
    }

    console.log('Creating new Google Maps script tag')
    
    // Create new script
    const script = document.createElement('script')
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    console.log('Google Maps API Key:', apiKey ? 'Present' : 'Missing')
    
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing`
    script.async = true
    script.defer = true
    
    script.onload = () => {
      console.log('Google Maps script loaded successfully')
      window.googleMapsLoaded = true
      resolve()
    }
    
    script.onerror = () => {
      console.error('Failed to load Google Maps script')
      reject(new Error('Failed to load Google Maps API'))
    }

    // Store the promise on window to prevent duplicate loading
    window.googleMapsLoadPromise = loadPromise!

    document.head.appendChild(script)
    console.log('Google Maps script added to document head')
  })

  return loadPromise
}

export function isGoogleMapsLoaded(): boolean {
  return !!(window.google && window.googleMapsLoaded)
}

export function getGoogleMaps(): typeof google | null {
  return window.google && window.googleMapsLoaded ? window.google : null
} 