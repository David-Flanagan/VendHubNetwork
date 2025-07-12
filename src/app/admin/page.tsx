'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function AdminPage() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (isAdmin) {
        // If already logged in as admin, go to dashboard
        router.push('/admin/dashboard')
      } else {
        // If not admin, go to login
        router.push('/admin/login')
      }
    }
  }, [loading, isAdmin, router])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">
          {loading ? 'Checking authentication...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  )
} 