'use client'

import { useState, useEffect } from 'react'
import { Company } from '@/types'
import { supabase } from '@/lib/supabase'

interface PublicVendHubStatsProps {
  company: Company
}

interface CompanyStats {
  totalProducts: number
  totalMachines: number
  daysInNetwork: number
  responseTime: string
}

export default function PublicVendHubStats({ company }: PublicVendHubStatsProps) {
  const [stats, setStats] = useState<CompanyStats>({
    totalProducts: 0,
    totalMachines: 0,
    daysInNetwork: 0,
    responseTime: '24 hours'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCompanyStats()
  }, [company.id])

  const fetchCompanyStats = async () => {
    try {
      setLoading(true)
      
      // Fetch products count
      const { count: productsCount } = await supabase
        .from('company_products')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('is_available', true)

      // Fetch machines count
      const { count: machinesCount } = await supabase
        .from('company_machine_templates')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('is_active', true)

      // Calculate days in network
      const createdDate = new Date(company.created_at)
      const now = new Date()
      const daysInNetwork = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

      setStats({
        totalProducts: productsCount || 0,
        totalMachines: machinesCount || 0,
        daysInNetwork,
        responseTime: '24 hours' // This could be calculated from actual response times
      })
    } catch (error) {
      console.error('Error fetching company stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="flex items-center mb-8">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">VendHub Network Stats</h2>
        </div>
        
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
      <div className="flex items-center mb-8">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900">VendHub Network Stats</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="text-center p-6 bg-blue-50 rounded-2xl border border-blue-100">
          <div className="text-3xl font-bold text-blue-600 mb-2">{stats.totalProducts}</div>
          <div className="text-sm font-semibold text-gray-700">Products</div>
        </div>
        
        <div className="text-center p-6 bg-green-50 rounded-2xl border border-green-100">
          <div className="text-3xl font-bold text-green-600 mb-2">{stats.totalMachines}</div>
          <div className="text-sm font-semibold text-gray-700">Machines</div>
        </div>
        
        <div className="text-center p-6 bg-purple-50 rounded-2xl border border-purple-100">
          <div className="text-3xl font-bold text-purple-600 mb-2">{stats.daysInNetwork}</div>
          <div className="text-sm font-semibold text-gray-700">Days in Network</div>
        </div>
        
        <div className="text-center p-6 bg-orange-50 rounded-2xl border border-orange-100">
          <div className="text-3xl font-bold text-orange-600 mb-2">{stats.responseTime}</div>
          <div className="text-sm font-semibold text-gray-700">Response Time</div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-blue-800 text-sm font-medium">
            These statistics are automatically calculated and updated based on {company.name}'s activity in the VendHub Network.
          </span>
        </div>
      </div>
    </div>
  )
} 