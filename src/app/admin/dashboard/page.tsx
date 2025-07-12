'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface DashboardStats {
  globalProducts: number
  machineTemplates: number
  productTypes: number
  users: number
}

export default function AdminDashboard() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    globalProducts: 0,
    machineTemplates: 0,
    productTypes: 0,
    users: 0
  })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    console.log('AdminDashboard: loading=', loading, 'isAdmin=', isAdmin, 'user=', user?.email)
    if (!loading && !isAdmin) {
      console.log('AdminDashboard: Redirecting to login - not admin')
      router.push('/admin/login')
    }
  }, [loading, isAdmin, router, user])

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardStats()
    }
  }, [isAdmin])

  const fetchDashboardStats = async () => {
    try {
      setLoadingStats(true)
      
      // Fetch counts for all stats
      const [
        { count: globalProducts },
        { count: machineTemplates },
        { count: productTypes },
        { count: users }
      ] = await Promise.all([
        supabase.from('global_products').select('*', { count: 'exact', head: true }),
        supabase.from('machine_templates').select('*', { count: 'exact', head: true }),
        supabase.from('product_types').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true })
      ])

      setStats({
        globalProducts: globalProducts || 0,
        machineTemplates: machineTemplates || 0,
        productTypes: productTypes || 0,
        users: users || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/admin/login')
  }

  if (loading || loadingStats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">System Management</h2>
          <p className="text-gray-600 mt-2">Manage global catalogs and system settings</p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Global Products</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.globalProducts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Machine Templates</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.machineTemplates}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Product Types</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.productTypes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Users</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.users}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Management Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/admin/products" className="block">
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Global Product Catalog</h3>
              <p className="text-gray-600 mb-4">Manage the master catalog of all available products</p>
              <div className="text-sm text-blue-600">Manage Products →</div>
            </div>
          </Link>

          <Link href="/admin/machine-templates" className="block">
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Machine Templates</h3>
              <p className="text-gray-600 mb-4">Manage global machine templates</p>
              <div className="text-sm text-green-600">Manage Templates →</div>
            </div>
          </Link>

          <Link href="/admin/machine-categories" className="block">
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Machine Categories</h3>
              <p className="text-gray-600 mb-4">Manage vending machine categories</p>
              <div className="text-sm text-teal-600">Manage Categories →</div>
            </div>
          </Link>

          <Link href="/admin/product-types" className="block">
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Product Types</h3>
              <p className="text-gray-600 mb-4">Manage product categories and types</p>
              <div className="text-sm text-purple-600">Manage Product Types →</div>
            </div>
          </Link>

          <Link href="/admin/users" className="block">
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
              <p className="text-gray-600 mb-4">Manage user roles and permissions</p>
              <div className="text-sm text-orange-600">Manage Users →</div>
            </div>
          </Link>

          <Link href="/admin/settings" className="block">
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">System Settings</h3>
              <p className="text-gray-600 mb-4">Configure platform-wide settings</p>
              <div className="text-sm text-gray-600">Manage Settings →</div>
            </div>
          </Link>

          <Link href="/admin/data" className="block">
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Management</h3>
              <p className="text-gray-600 mb-4">Clean and maintain system data</p>
              <div className="text-sm text-red-600">Manage Data →</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
} 