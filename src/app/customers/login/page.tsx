'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'

export default function CustomerLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [componentMounted, setComponentMounted] = useState(false)
  const router = useRouter()
  const { showToast } = useToast()

  // Add debug logging function
  const addDebugLog = (message: string) => {
    console.log(`[CustomerLogin Debug] ${message}`)
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  // Component mount effect
  useEffect(() => {
    setComponentMounted(true)
    addDebugLog('Component mounted')
    // Test Supabase connection
    const testConnection = async () => {
      try {
        addDebugLog('Testing Supabase connection...')
        const { error } = await supabase.from('users').select('count').limit(1)
        if (error) {
          addDebugLog(`Supabase connection error: ${error.message}`)
        } else {
          addDebugLog('Supabase connection successful')
        }
      } catch (err) {
        addDebugLog(`Supabase connection test failed: ${err}`)
      }
    }
    testConnection()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    addDebugLog('Login attempt started')
    try {
      addDebugLog(`Attempting to sign in with email: ${email}`)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        addDebugLog(`Auth error: ${error.message} (${error.status})`)
        throw error
      }
      addDebugLog(`Auth successful for user: ${data.user?.email}`)
      addDebugLog(`User ID: ${data.user?.id}`)
      if (data.user) {
        // Check if user has customer role with retry mechanism
        let userData = null
        let userError = null
        let retries = 0
        const maxRetries = 3
        addDebugLog('Checking user role in database...')
        while (retries < maxRetries) {
          addDebugLog(`Role check attempt ${retries + 1}/${maxRetries}`)
          const { data: userResult, error: userResultError } = await supabase
            .from('users')
            .select('role, company_id')
            .eq('id', data.user.id)
            .single()
          userData = userResult
          userError = userResultError
          addDebugLog(`Role check result: ${userError ? `Error: ${userError.message}` : `Success: ${JSON.stringify(userData)}`}`)
          if (!userError && userData) {
            addDebugLog('User role found, exiting retry loop')
            break
          }
          if (userError && userError.code === 'PGRST116') {
            addDebugLog('User not found in database, will retry...')
            retries++
            if (retries < maxRetries) {
              addDebugLog('Waiting 1 second before retry...')
              await new Promise(resolve => setTimeout(resolve, 1000))
              continue
            }
          }
          addDebugLog('Exiting retry loop due to error or max retries')
          break
        }
        if (userError) {
          addDebugLog(`Final user role check error: ${userError.message}`)
          console.error('Error checking user role:', userError)
          showToast('Error verifying user role. Please try signing up again.', 'error')
          await supabase.auth.signOut()
          return
        }
        if (!userData) {
          addDebugLog('No user data found after all retries')
          showToast('User account not found. Please try signing up again.', 'error')
          await supabase.auth.signOut()
          return
        }
        addDebugLog(`User role: ${userData.role}`)
        addDebugLog(`Company ID: ${userData.company_id}`)
        if (userData.role !== 'customer') {
          addDebugLog(`User role is not customer: ${userData.role}`)
          showToast('This account is not a customer account', 'error')
          await supabase.auth.signOut()
          return
        }
        addDebugLog('User role verified as customer, redirecting to dashboard')
        showToast('Welcome back!', 'success')
        router.push('/customers/dashboard')
      }
    } catch (error: any) {
      addDebugLog(`Login error caught: ${error.message}`)
      console.error('Login error:', error)
      showToast(error.message || 'Error signing in', 'error')
    } finally {
      setLoading(false)
      addDebugLog('Login attempt finished')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Sign in to Customer Account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Access your VendHub Network customer dashboard
          </p>
        </div>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Debug Info Panel - Only show in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 bg-gray-100 lg:px-2">
              <h3 className="text-sm font-medium text-gray-700">Debug Info:</h3>
              <div className="text-xs text-gray-600 max-h-32 overflow-y-auto">
                <div>Component Mounted: {componentMounted ? 'Yes' : 'No'}</div>
                <div>Loading State: {loading ? 'Yes' : 'No'}</div>
                <div>Email: {email || 'Not set'}</div>
                <div>Password Length: {password.length}</div>
                <div className="mt-2">
                  <strong>Logs:</strong>
                  {debugInfo.length === 0 ? (
                    <div>No logs yet</div>
                  ) : (
                    debugInfo.slice(-5).map((log, index) => (
                      <div key={index} className="font-mono text-xs">{log}</div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    addDebugLog(`Email changed to: ${e.target.value}`)
                  }}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    addDebugLog(`Password changed (length: ${e.target.value.length})`)
                  }}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Don't have an account?</span>
              </div>
            </div>
            <div className="mt-6 text-center">
              <Link
                href="/customers/signup"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Create a customer account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 