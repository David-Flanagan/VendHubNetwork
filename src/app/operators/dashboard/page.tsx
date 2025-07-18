'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import { Company } from '@/types'

export default function OperatorDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState<Company | null>(null)
  const [stats, setStats] = useState({
    totalProducts: 0,
    availableProducts: 0,
    totalMachines: 0
  })
  const { showToast } = useToast()

  useEffect(() => {
    if (user?.company_id) {
      fetchCompanyData()
    } else {
      // If user has no company_id, still set loading to false
      setLoading(false)
    }
  }, [user])

  const fetchCompanyData = async () => {
    try {
      if (!user?.company_id) {
        setLoading(false)
        return
      }

      // Get company data
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', user.company_id)
        .single()

      if (!companyError && companyData) {
        setCompany(companyData)
        await fetchStats(companyData.id)
      } else {
        console.error('Error fetching company data:', companyError)
        showToast('Error loading company data', 'error')
      }
    } catch (error) {
      console.error('Error fetching company data:', error)
      showToast('Error loading company data', 'error')
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

      // For now, set available products same as total since is_available might not exist
      setStats({
        totalProducts: productsCount || 0,
        availableProducts: productsCount || 0,
        totalMachines: 0 // TODO: Implement machine tracking
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      // Set default stats if there's an error
      setStats({
        totalProducts: 0,
        availableProducts: 0,
        totalMachines: 0
      })
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
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

            {/* Welcome Section */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Your Dashboard</h2>
              <p className="text-gray-600 mb-6">
                Use the sidebar navigation to manage your vending operations, products, and customer relationships.
              </p>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Manage your profile and branding</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span>Browse and add products</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Handle customer requests</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 