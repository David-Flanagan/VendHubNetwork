'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Company } from '@/types'

export default function OperatorDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [stats, setStats] = useState({
    totalProducts: 0,
    availableProducts: 0,
    totalMachines: 0
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        router.push('/operators/login')
        return
      }

      // Get user data with role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (userError || !userData) {
        router.push('/operators/login')
        return
      }

      if (userData.role !== 'operator') {
        router.push('/operators/login')
        return
      }

      setUser(userData)

      // Get company data
      if (userData.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', userData.company_id)
          .single()

        if (!companyError && companyData) {
          setCompany(companyData)
          await fetchStats(companyData.id)
        }
      }
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/operators/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async (companyId: string) => {
    try {
      // Get company products count
      const { count: productsCount } = await supabase
        .from('company_products')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)

      const { count: availableCount } = await supabase
        .from('company_products')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_available', true)

      setStats({
        totalProducts: productsCount || 0,
        availableProducts: availableCount || 0,
        totalMachines: 0 // TODO: Implement machine tracking
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/operators/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Operator Dashboard</h1>
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
        {/* Company Info */}
        {company && (
          <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Company Name</p>
                <p className="text-gray-900">{company.name}</p>
              </div>
              {company.contact_email && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Contact Email</p>
                  <p className="text-gray-900">{company.contact_email}</p>
                </div>
              )}
              {company.contact_phone && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Contact Phone</p>
                  <p className="text-gray-900">{company.contact_phone}</p>
                </div>
              )}
              {company.website && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Website</p>
                  <p className="text-gray-900">{company.website}</p>
                </div>
              )}
            </div>
            {company.description && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-600">Description</p>
                <p className="text-gray-900">{company.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalProducts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Available Products</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.availableProducts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Machines</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalMachines}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <a href="/operators/global-catalog" className="block">
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse Global Catalog</h3>
              <p className="text-gray-600 mb-4">Find and add products to your company catalog</p>
              <div className="text-sm text-blue-600">Browse Products →</div>
            </div>
          </a>

          <a href="/operators/catalog" className="block">
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Company Catalog</h3>
              <p className="text-gray-600 mb-4">Manage your company's product offerings</p>
              <div className="text-sm text-green-600">View Catalog →</div>
            </div>
          </a>

          <a href="/operators/global-machine-templates" className="block">
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Machine Templates</h3>
              <p className="text-gray-600 mb-4">Browse and add machine templates</p>
              <div className="text-sm text-orange-600">Browse Templates →</div>
            </div>
          </a>

          <a href="/operators/machine-templates" className="block">
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">My Machine Templates</h3>
              <p className="text-gray-600 mb-4">Manage your company's machine templates</p>
              <div className="text-sm text-purple-600">Manage Templates →</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
} 