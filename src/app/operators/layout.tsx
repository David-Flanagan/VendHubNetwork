'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import RouteGuard from '@/components/auth/RouteGuard'
import OperatorSidebar from '@/components/layout/OperatorSidebar'

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, isOperator } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/operators/login')
    } else if (!loading && user && !isOperator) {
      router.push('/')
    }
  }, [user, loading, isOperator, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !isOperator) {
    return null
  }

  return (
          <RouteGuard requiredRole="operator" redirectTo="/auth/operators/login">
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <OperatorSidebar />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Operator Dashboard</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
              </div>
            </div>
          </header>
          
          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </RouteGuard>
  )
} 