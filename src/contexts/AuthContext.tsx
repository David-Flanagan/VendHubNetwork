'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, getCurrentUser, onAuthStateChange, getFullUserData } from '@/lib/auth'
import { UserRoleType } from '@/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  isOperator: boolean
  isCustomer: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isOperator: false,
  isCustomer: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    let isSubscribed = true

    // Check initial auth state with timeout
    const checkAuth = async () => {
      const timeoutId = setTimeout(() => {
        if (isSubscribed && loading) {
          console.warn('Auth check timed out, setting loading to false')
          setLoading(false)
        }
      }, 10000) // 10 second timeout

      try {
        const currentUser = await getCurrentUser()
        clearTimeout(timeoutId)
        if (isSubscribed) {
          setUser(currentUser)
        }
      } catch (error) {
        clearTimeout(timeoutId)
        console.error('Error checking auth:', error)
      } finally {
        if (isSubscribed) {
          setLoading(false)
        }
      }
    }

    checkAuth()

    // Listen for auth state changes
    const { data: { subscription } } = onAuthStateChange(async (authUser) => {
      if (!isSubscribed) return
      
      try {
        if (authUser && authUser.role === 'unknown') {
          // Get full user data for users with unknown role
          const fullUser = await getFullUserData(authUser.id)
          setUser(fullUser)
        } else {
          setUser(authUser)
        }
      } catch (error) {
        console.error('Error updating user data:', error)
        setUser(authUser) // Use basic user data if full data fetch fails
      } finally {
        setLoading(false)
      }
    })

    return () => {
      isSubscribed = false
      subscription.unsubscribe()
    }
  }, [mounted])

  const value = {
    user,
    loading: !mounted || loading,
    isAdmin: user?.role === 'admin',
    isOperator: user?.role === 'operator',
    isCustomer: user?.role === 'customer',
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 