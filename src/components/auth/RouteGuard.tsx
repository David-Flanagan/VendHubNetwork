'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface RouteGuardProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'operator' | 'customer'
  requiredRoles?: ('admin' | 'operator' | 'customer')[]
  requireAuth?: boolean
  redirectTo?: string
}

export default function RouteGuard({
  children,
  requiredRole,
  requiredRoles,
  requireAuth = true,
  redirectTo = '/'
}: RouteGuardProps) {
  const { user, loading, isAdmin, isOperator, isCustomer } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return // Wait for auth state to load

    // If auth is required but user is not logged in
    if (requireAuth && !user) {
      router.push(redirectTo)
      return
    }

    // If role is required, check if user has the required role
    if (requiredRole || requiredRoles) {
      const rolesToCheck = requiredRoles || [requiredRole!]
      const hasRequiredRole = rolesToCheck.some(role => 
        (role === 'admin' && isAdmin) ||
        (role === 'operator' && isOperator) ||
        (role === 'customer' && isCustomer)
      )

      if (!hasRequiredRole) {
        router.push(redirectTo)
        return
      }
    }
  }, [user, loading, isAdmin, isOperator, requireAuth, requiredRole, requiredRoles, redirectTo, router])

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If auth is required but user is not logged in, show nothing while redirecting
  if (requireAuth && !user) {
    return null
  }

  // If role is required but user doesn't have it, show nothing while redirecting
  if (requiredRole || requiredRoles) {
    const rolesToCheck = requiredRoles || [requiredRole!]
    const hasRequiredRole = rolesToCheck.some(role => 
      (role === 'admin' && isAdmin) ||
      (role === 'operator' && isOperator) ||
      (role === 'customer' && isCustomer)
    )

    if (!hasRequiredRole) {
      return null
    }
  }

  return <>{children}</>
} 