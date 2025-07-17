'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import RouteGuard from '@/components/auth/RouteGuard'
import PreviewCardEditor from '@/components/operators/PreviewCardEditor'

export default function PreviewCardPage() {
  const router = useRouter()
  const { user, loading, isOperator } = useAuth()

  useEffect(() => {
    // If user is logged in and is an operator, redirect to dashboard
    if (!loading && user && isOperator) {
      // Stay on this page - it's for operators
    }
  }, [user, loading, isOperator, router])

  return (
    <RouteGuard requiredRole="operator" redirectTo="/auth/operators/login">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">Preview Card Editor</h1>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/operators/dashboard')}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  ← Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="py-8">
          <PreviewCardEditor />
        </div>
      </div>
    </RouteGuard>
  )
} 