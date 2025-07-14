'use client'

import { useState, useEffect } from 'react'

export default function GoogleMapsDebug() {
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'present' | 'missing'>('checking')
  const [apiKey, setApiKey] = useState<string>('')

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (key) {
      setApiKeyStatus('present')
      setApiKey(key.substring(0, 10) + '...' + key.substring(key.length - 4))
    } else {
      setApiKeyStatus('missing')
    }
  }, [])

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold text-yellow-800 mb-2">Google Maps API Debug</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>API Key Status:</strong>{' '}
          {apiKeyStatus === 'checking' && <span className="text-gray-600">Checking...</span>}
          {apiKeyStatus === 'present' && <span className="text-green-600">✓ Present</span>}
          {apiKeyStatus === 'missing' && <span className="text-red-600">✗ Missing</span>}
        </div>
        
        {apiKeyStatus === 'present' && (
          <div>
            <strong>API Key Preview:</strong> <code className="bg-gray-100 px-1 rounded">{apiKey}</code>
          </div>
        )}
        
        {apiKeyStatus === 'missing' && (
          <div className="text-red-700">
            <p><strong>To fix this:</strong></p>
            <ol className="list-decimal list-inside ml-4 space-y-1">
              <li>Create a <code>.env.local</code> file in your project root</li>
              <li>Add: <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here</code></li>
              <li>Restart your development server</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  )
} 