'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'

export default function AuthDebug() {
  const { user, loading, isAdmin, isOperator } = useAuth()
  const [showDebug, setShowDebug] = useState(false)

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="bg-red-500 text-white px-3 py-1 rounded text-xs"
      >
        Auth Debug
      </button>
      
      {showDebug && (
        <div className="absolute bottom-8 right-0 bg-white border border-gray-300 rounded p-4 shadow-lg text-xs max-w-xs">
          <div className="space-y-2">
            <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
            <div><strong>User:</strong> {user ? user.email : 'None'}</div>
            <div><strong>Role:</strong> {user?.role || 'None'}</div>
            <div><strong>Is Admin:</strong> {isAdmin ? 'Yes' : 'No'}</div>
            <div><strong>Is Operator:</strong> {isOperator ? 'Yes' : 'No'}</div>
            <div><strong>Company ID:</strong> {user?.company_id || 'None'}</div>
          </div>
        </div>
      )}
    </div>
  )
} 