'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'

export default function CustomerLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { showToast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        throw error
      }

      if (data.user) {
        // Check if user has customer role with retry mechanism
        let userData = null
        let userError = null
        let retries = 0
        const maxRetries = 3

        while (retries < maxRetries) {
          const { data: userResult, error: userResultError } = await supabase
            .from('users')
            .select('role')
            .eq('id', data.user.id)
            .single()

          userData = userResult
          userError = userResultError

          if (!userError && userData) {
            break // Success, exit retry loop
          }

          if (userError && userError.code === 'PGRST116') {
            // User not found, wait a bit and retry (might be timing issue)
            retries++
            if (retries < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
              continue
            }
          }

          break // Exit retry loop for other errors or max retries reached
        }

        if (userError) {
          console.error('Error checking user role:', userError)
          showToast('Error verifying user role. Please try signing up again.', 'error')
          await supabase.auth.signOut()
          return
        }

        if (!userData || userData.role !== 'customer') {
          showToast('This account is not a customer account', 'error')
          await supabase.auth.signOut()
          return
        }

        showToast('Welcome back!', 'success')
        router.push('/customers/dashboard')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      showToast(error.message || 'Error signing in', 'error')
    } finally {
      setLoading(false)
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
                  onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
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