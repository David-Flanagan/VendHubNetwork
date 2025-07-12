'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, getCurrentUser, onAuthStateChange } from '@/lib/auth'
import { UserRoleType } from '@/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check initial auth state
    const checkAuth = async () => {
      try {
        console.log('AuthContext: Checking initial auth state')
        const currentUser = await getCurrentUser()
        console.log('AuthContext: Current user set to:', currentUser?.email, 'Role:', currentUser?.role)
        setUser(currentUser)
      } catch (error) {
        console.error('AuthContext: Error checking auth:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth state changes
    const { data: { subscription } } = onAuthStateChange((user) => {
      console.log('AuthContext: Auth state changed, user:', user?.email, 'Role:', user?.role)
      setUser(user)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    user,
    loading,
    isAdmin: user?.role === 'admin',
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